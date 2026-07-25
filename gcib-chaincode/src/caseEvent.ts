/*
 * GCIB Chaincode — case event model
 * SPDX-License-Identifier: Apache-2.0
 *
 * Principle 2: process-event threading. The audited unit is the
 * investigative workflow itself — who departed, what they found, when they
 * returned — not the evidence artifact. Every event threads to one
 * complaint number.
 *
 * Narrative text, sketch images and personal details stay off-chain in
 * PostgreSQL and IPFS; only the hash and references are anchored here.
 */

import {Object, Property} from 'fabric-contract-api';

@Object()
export class CaseEvent {
    @Property()
    public docType = 'caseEvent';

    @Property()
    public eventId = '';

    /** The consolidation key — links this event to its complaint. */
    @Property()
    public complaintNumber = '';

    /** INVESTIGATION_DEPARTURE | INVESTIGATION_FINDING_DETAILS | INVESTIGATION_RETURN */
    @Property()
    public eventType = '';

    /** Officer-stated date and time of the event itself. */
    @Property()
    public eventDate = '';

    @Property()
    public eventTime = '';

    /** Regimental numbers of the officers involved. */
    @Property()
    public officerIds: string[] = [];

    /** Weapon serial numbers taken out. Empty when none carried. */
    @Property()
    public weaponSerialsOut: string[] = [];

    /** Weapon serial numbers returned. Must match weaponSerialsOut on return. */
    @Property()
    public weaponSerialsIn: string[] = [];

    /** SHA-256 of the off-chain event record: narrative text, findings. */
    @Property()
    public offChainRecordHash = '';

    /** IPFS CID of an encrypted sketch or scene photograph. Empty when none. */
    @Property()
    public attachmentCID = '';

    /** From the officer's certificate at seal time — never a parameter. */
    @Property()
    public recordingOfficerId = '';

    @Property()
    public recordingOfficerRank = '';

    @Property()
    public recordingOfficerStation = '';

    /** Ledger-assigned, authoritative, immutable. */
    @Property()
    public sealTimestamp = '';
}
