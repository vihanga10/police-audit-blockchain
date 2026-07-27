/*
 * FabricService — the on-chain half of the on-chain/off-chain split.
 *
 * Wraps the Fabric Gateway SDK connection so every future module
 * (complaints, case events, property, court records) reuses one
 * connection rather than each reimplementing gRPC/TLS setup.
 *
 * IMPORTANT PROTOTYPE LIMITATION, stated plainly here rather than hidden:
 * this connects using ONE hardcoded officer identity (officer36355) read
 * from the local filesystem wallet. In the finished system each officer
 * would authenticate and the backend would load THEIR certificate for
 * THEIR request, so recordingOfficerId reflects who is actually logged
 * in. Wiring that up is the next step after this slice — it needs the
 * Fabric CA enrollment/login flow, not just the gateway connection.
 * Until then, every write through this backend is attributed to
 * officer36355, which is fine for proving the pipeline but not yet a
 * true multi-officer system.
 */

import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import * as grpc from '@grpc/grpc-js';
import {
  connect,
  Gateway,
  Identity,
  Signer,
  signers,
} from '@hyperledger/fabric-gateway';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

// Paths into the test-network's generated crypto material.
// Overridable via env vars once this moves beyond the local test network.
const TEST_NETWORK =
  process.env.FABRIC_TEST_NETWORK_PATH ??
  path.join(
    process.env.HOME ?? '',
    'Desktop/Research/fabric-samples/test-network',
  );

const MSP_ID = process.env.FABRIC_MSP_ID ?? 'Org1MSP';
const PEER_ENDPOINT = process.env.FABRIC_PEER_ENDPOINT ?? 'localhost:7051';
const PEER_HOST_ALIAS =
  process.env.FABRIC_PEER_HOST_ALIAS ?? 'peer0.org1.example.com';
const CHANNEL_NAME = process.env.FABRIC_CHANNEL ?? 'mychannel';
const CHAINCODE_NAME = process.env.FABRIC_CHAINCODE ?? 'gcib';

const OFFICER_MSP_DIR = path.join(
  TEST_NETWORK,
  'organizations/peerOrganizations/org1.example.com/users/officer36355@org1.example.com/msp',
);
const TLS_CERT_PATH = path.join(
  TEST_NETWORK,
  'organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt',
);

@Injectable()
export class FabricService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FabricService.name);
  private client!: grpc.Client;
  private gateway!: Gateway;

  async onModuleInit() {
    const tlsRootCert = await fs.readFile(TLS_CERT_PATH);
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
    this.client = new grpc.Client(PEER_ENDPOINT, tlsCredentials, {
      'grpc.ssl_target_name_override': PEER_HOST_ALIAS,
    });

    const identity = await this.loadIdentity();
    const signer = await this.loadSigner();

    this.gateway = connect({
      client: this.client,
      identity,
      signer,
      evaluateOptions: () => ({ deadline: Date.now() + 5000 }),
      endorseOptions: () => ({ deadline: Date.now() + 15000 }),
      submitOptions: () => ({ deadline: Date.now() + 5000 }),
      commitStatusOptions: () => ({ deadline: Date.now() + 60000 }),
    });

    this.logger.log(
      `Connected to Fabric Gateway as officer36355 on channel '${CHANNEL_NAME}'`,
    );
  }

  onModuleDestroy() {
    this.gateway?.close();
    this.client?.close();
  }

  private async loadIdentity(): Promise<Identity> {
    const certDir = path.join(OFFICER_MSP_DIR, 'signcerts');
    const certFile = (await fs.readdir(certDir))[0];
    const credentials = await fs.readFile(path.join(certDir, certFile));
    return { mspId: MSP_ID, credentials };
  }

  private async loadSigner(): Promise<Signer> {
    const keyDir = path.join(OFFICER_MSP_DIR, 'keystore');
    const keyFile = (await fs.readdir(keyDir))[0];
    const privateKeyPem = await fs.readFile(path.join(keyDir, keyFile));
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    return signers.newPrivateKeySigner(privateKey);
  }

  /** Writes to the ledger — recordComplaint, captureStatement, appendCaseEvent, amendComplaint. */
  async submitTransaction(fn: string, ...args: string[]): Promise<string> {
    const network = this.gateway.getNetwork(CHANNEL_NAME);
    const contract = network.getContract(CHAINCODE_NAME);
    const result = await contract.submitTransaction(fn, ...args);
    return Buffer.from(result).toString('utf8');
  }

  /** Reads from the ledger — readComplaint, queryCaseHistory, queryOfficerWork. */
  async evaluateTransaction(fn: string, ...args: string[]): Promise<string> {
    const network = this.gateway.getNetwork(CHANNEL_NAME);
    const contract = network.getContract(CHAINCODE_NAME);
    const result = await contract.evaluateTransaction(fn, ...args);
    return Buffer.from(result).toString('utf8');
  }
}
