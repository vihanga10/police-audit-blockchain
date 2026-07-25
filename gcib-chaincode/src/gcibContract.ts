/*
 * GCIB Chaincode — contract
 * SPDX-License-Identifier: Apache-2.0
 *
 * DESIGN RULES ENFORCED HERE
 * --------------------------
 * 1. Nothing is ever overwritten or deleted. There is no update function and
 *    no delete function. Corrections append a new version linked to the
 *    previous one. The absence of those functions IS the integrity guarantee.
 *
 * 2. Officer identity, rank, station and all timestamps are read from the
 *    transaction context — never accepted as parameters. A client cannot
 *    forge who recorded something or when.
 *
 * 3. All writes use deterministic JSON serialisation. Every endorsing peer
 *    executes this code independently and must produce byte-identical
 *    results, or endorsement fails.
 */

import {Context, Contract, Info, Returns, Transaction} from 'fabric-contract-api';
import stringify from 'json-stringify-deterministic';
import sortKeysRecursive from 'sort-keys-recursive';
import {Complaint, Statement} from './complaint';
import {CaseEvent} from './caseEvent';

const STATEMENT = 'statement';
const COMPLAINT = 'complaint';
const EVENT = 'event';

@Info({
    title: 'GCIBContract',
    description: 'Tamper-evident audit of Crime Branch investigative work',
})
export class GCIBContract extends Contract {

    // ─────────────────────────────────────────────────────────────
    //  Context helpers — the values a client must never supply
    // ─────────────────────────────────────────────────────────────

    /**
     * Ledger-assigned time. Identical on every endorsing peer, so it is both
     * deterministic and unforgeable by the client. This is the reference
     * point used later to check whether a certificate was valid when a
     * record was signed.
     */
    private txTime(ctx: Context): string {
        const ts = ctx.stub.getTxTimestamp();
        const millis = Number(ts.seconds) * 1000 + Math.round(ts.nanos / 1e6);
        return new Date(millis).toISOString();
    }

    /** Regimental number, taken from the officer's X.509 certificate. */
    private officerId(ctx: Context): string {
        const id = ctx.clientIdentity.getAttributeValue('officerId');
        if (!id) {
            throw new Error('Certificate carries no officerId attribute');
        }
        return id;
    }

    /**
     * Rank and station AS THEY ARE NOW. These get written into the record and
     * are never updated afterwards — the officer will be promoted and
     * transferred, but the record must always describe who they were when
     * they wrote it.
     */
    private officerRank(ctx: Context): string {
        return ctx.clientIdentity.getAttributeValue('rank') ?? '';
    }

    private officerStation(ctx: Context): string {
        return ctx.clientIdentity.getAttributeValue('station') ?? '';
    }

    /** Version numbers are zero-padded so composite keys sort correctly. */
    private pad(n: number): string {
        return n.toString().padStart(6, '0');
    }

    private async put(ctx: Context, key: string, value: unknown): Promise<void> {
        await ctx.stub.putState(
            key,
            Buffer.from(stringify(sortKeysRecursive(value as object))),
        );
    }

    // ─────────────────────────────────────────────────────────────
    //  PRINCIPLE 1 — capture-time integrity anchoring
    // ─────────────────────────────────────────────────────────────

    /**
     * Anchors a statement at the moment of capture, BEFORE the complaint
     * exists and before the officer has typed anything.
     *
     * Called when the officer stops recording. From this point the victim's
     * original account is immutable, so the typed statement written later
     * remains verifiable against it forever. This is what makes the phrase
     * "capture-time" literally true rather than a description of seal time.
     *
     * Pass noAudioReason when no recording was made. Absence of audio must
     * always be explained — a silently empty field cannot be distinguished
     * from a failure.
     */
    @Transaction()
    public async captureStatement(
        ctx: Context,
        statementId: string,
        statementRole: string,
        audioHash: string,
        audioCID: string,
        noAudioReason: string,
    ): Promise<void> {
        const key = ctx.stub.createCompositeKey(STATEMENT, [statementId]);

        const existing = await ctx.stub.getState(key);
        if (existing.length > 0) {
            throw new Error(`Statement ${statementId} is already anchored`);
        }

        if (!audioHash && !noAudioReason) {
            throw new Error('Either an audio hash or a reason for its absence is required');
        }

        const statement: Statement = {
            docType: STATEMENT,
            statementId,
            statementRole,
            audioHash,
            audioCID,
            noAudioReason,
            captureTimestamp: this.txTime(ctx),
            capturingOfficerId: this.officerId(ctx),
            stationCode: this.officerStation(ctx),
            complaintNumber: '',
        };

        await this.put(ctx, key, statement);
    }

    /** Reads an anchored statement. Used to verify audio has not been swapped. */
    @Transaction(false)
    @Returns('string')
    public async readStatement(ctx: Context, statementId: string): Promise<string> {
        const key = ctx.stub.createCompositeKey(STATEMENT, [statementId]);
        const data = await ctx.stub.getState(key);
        if (data.length === 0) {
            throw new Error(`Statement ${statementId} does not exist`);
        }
        return data.toString();
    }

    // ─────────────────────────────────────────────────────────────
    //  Sealing the complaint
    // ─────────────────────────────────────────────────────────────

    /**
     * Seals the original complaint. Version 1 — never overwritten.
     *
     * Every statement id passed here must already be anchored, which enforces
     * the capture-before-seal ordering: a complaint cannot be sealed
     * referencing a statement that was never captured.
     */
    @Transaction()
    public async recordComplaint(
        ctx: Context,
        complaintNumber: string,
        crimeType: string,
        category: string,
        isMajorCrime: boolean,
        crimeDate: string,
        crimeTime: string,
        crimeHour: number,
        offChainRecordHash: string,
        statementIdsJSON: string,
        locationConfirmedByOfficer: boolean,
        statementReadBackConfirmed: boolean,
        vulnerableVictim: boolean,
    ): Promise<void> {
        const key = ctx.stub.createCompositeKey(COMPLAINT, [complaintNumber, this.pad(1)]);

        const existing = await ctx.stub.getState(key);
        if (existing.length > 0) {
            throw new Error(`Complaint ${complaintNumber} already exists`);
        }

        const statementIds: string[] = JSON.parse(statementIdsJSON);

        for (const sid of statementIds) {
            const sKey = ctx.stub.createCompositeKey(STATEMENT, [sid]);
            const sData = await ctx.stub.getState(sKey);
            if (sData.length === 0) {
                throw new Error(`Statement ${sid} was never anchored at capture`);
            }
        }

        const complaint: Complaint = {
            docType: COMPLAINT,
            complaintNumber,
            stationCode: this.officerStation(ctx),
            crimeType,
            category,
            isMajorCrime,
            crimeDate,
            crimeTime,
            crimeHour,
            offChainRecordHash,
            statementIds,
            locationConfirmedByOfficer,
            statementReadBackConfirmed,
            vulnerableVictim,
            recordingOfficerId: this.officerId(ctx),
            recordingOfficerRank: this.officerRank(ctx),
            recordingOfficerStation: this.officerStation(ctx),
            sealTimestamp: this.txTime(ctx),
            version: 1,
            prevVersionId: '',
            amendmentReason: '',
        };

        await this.put(ctx, key, complaint);
    }

    /**
     * Appends a correction as a NEW version. The previous version is left
     * exactly as it was.
     *
     * This mirrors the paper rule that pages cannot be torn from the register
     * — except here it is enforced mathematically rather than by convention.
     * There is deliberately no updateComplaint function.
     */
    @Transaction()
    public async amendComplaint(
        ctx: Context,
        complaintNumber: string,
        crimeType: string,
        category: string,
        isMajorCrime: boolean,
        crimeDate: string,
        crimeTime: string,
        crimeHour: number,
        offChainRecordHash: string,
        amendmentReason: string,
    ): Promise<void> {
        if (!amendmentReason) {
            throw new Error('An amendment requires a stated reason');
        }

        const latestJSON = await this.readComplaint(ctx, complaintNumber);
        const latest = JSON.parse(latestJSON) as Complaint;

        const newVersion = latest.version + 1;
        const key = ctx.stub.createCompositeKey(
            COMPLAINT, [complaintNumber, this.pad(newVersion)],
        );

        const amended: Complaint = {
            ...latest,
            crimeType,
            category,
            isMajorCrime,
            crimeDate,
            crimeTime,
            crimeHour,
            offChainRecordHash,
            recordingOfficerId: this.officerId(ctx),
            recordingOfficerRank: this.officerRank(ctx),
            recordingOfficerStation: this.officerStation(ctx),
            sealTimestamp: this.txTime(ctx),
            version: newVersion,
            prevVersionId: ctx.stub.createCompositeKey(
                COMPLAINT, [complaintNumber, this.pad(latest.version)],
            ),
            amendmentReason,
        };

        await this.put(ctx, key, amended);
    }

    /** Returns the most recent version of a complaint. */
    @Transaction(false)
    @Returns('string')
    public async readComplaint(ctx: Context, complaintNumber: string): Promise<string> {
        const versions = await this.complaintVersions(ctx, complaintNumber);
        if (versions.length === 0) {
            throw new Error(`Complaint ${complaintNumber} does not exist`);
        }
        return JSON.stringify(versions[versions.length - 1]);
    }

    /** Every version of a complaint, oldest first. The correction trail. */
    @Transaction(false)
    @Returns('string')
    public async readComplaintVersions(ctx: Context, complaintNumber: string): Promise<string> {
        return JSON.stringify(await this.complaintVersions(ctx, complaintNumber));
    }

    private async complaintVersions(ctx: Context, complaintNumber: string): Promise<Complaint[]> {
        const out: Complaint[] = [];
        const iterator = await ctx.stub.getStateByPartialCompositeKey(
            COMPLAINT, [complaintNumber],
        );
        let res = await iterator.next();
        while (!res.done) {
            out.push(JSON.parse(res.value.value.toString()) as Complaint);
            res = await iterator.next();
        }
        return out;
    }

    // ─────────────────────────────────────────────────────────────
    //  PRINCIPLE 2 — process-event threading
    // ─────────────────────────────────────────────────────────────

    /**
     * Appends an investigation event to a complaint. Departures, findings and
     * returns are all recorded through here, threaded under one complaint
     * number so the whole investigative process is one auditable sequence.
     */
    @Transaction()
    public async appendCaseEvent(
        ctx: Context,
        complaintNumber: string,
        eventId: string,
        eventType: string,
        eventDate: string,
        eventTime: string,
        officerIdsJSON: string,
        weaponSerialsOutJSON: string,
        weaponSerialsInJSON: string,
        offChainRecordHash: string,
        attachmentCID: string,
    ): Promise<void> {
        // the complaint must exist — an event cannot float unattached
        await this.readComplaint(ctx, complaintNumber);

        const key = ctx.stub.createCompositeKey(EVENT, [complaintNumber, eventId]);
        const existing = await ctx.stub.getState(key);
        if (existing.length > 0) {
            throw new Error(`Event ${eventId} already exists on ${complaintNumber}`);
        }

        const event: CaseEvent = {
            docType: EVENT,
            eventId,
            complaintNumber,
            eventType,
            eventDate,
            eventTime,
            officerIds: JSON.parse(officerIdsJSON),
            weaponSerialsOut: JSON.parse(weaponSerialsOutJSON),
            weaponSerialsIn: JSON.parse(weaponSerialsInJSON),
            offChainRecordHash,
            attachmentCID,
            recordingOfficerId: this.officerId(ctx),
            recordingOfficerRank: this.officerRank(ctx),
            recordingOfficerStation: this.officerStation(ctx),
            sealTimestamp: this.txTime(ctx),
        };

        await this.put(ctx, key, event);
    }

    // ─────────────────────────────────────────────────────────────
    //  PRINCIPLE 3 — consolidation under one identifier
    // ─────────────────────────────────────────────────────────────

    /**
     * Returns the whole case as one structure: the complaint with its full
     * version trail, its anchored statements, and every investigation event —
     * assembled by a single key.
     *
     * In the paper system this required physically pulling several separate
     * registers and cross-referencing them by hand.
     */
    @Transaction(false)
    @Returns('string')
    public async queryCaseHistory(ctx: Context, complaintNumber: string): Promise<string> {
        const versions = await this.complaintVersions(ctx, complaintNumber);
        if (versions.length === 0) {
            throw new Error(`Complaint ${complaintNumber} does not exist`);
        }
        const current = versions[versions.length - 1];

        const statements: Statement[] = [];
        for (const sid of current.statementIds) {
            const sKey = ctx.stub.createCompositeKey(STATEMENT, [sid]);
            const sData = await ctx.stub.getState(sKey);
            if (sData.length > 0) {
                statements.push(JSON.parse(sData.toString()) as Statement);
            }
        }

        const events: CaseEvent[] = [];
        const iterator = await ctx.stub.getStateByPartialCompositeKey(
            EVENT, [complaintNumber],
        );
        let res = await iterator.next();
        while (!res.done) {
            events.push(JSON.parse(res.value.value.toString()) as CaseEvent);
            res = await iterator.next();
        }

        return JSON.stringify({
            complaint: current,
            versionTrail: versions,
            statements,
            events,
        });
    }

    // ─────────────────────────────────────────────────────────────
    //  PRINCIPLE 4 — duty-compliance cross-referencing
    // ─────────────────────────────────────────────────────────────

    /**
     * Every event an officer recorded within a date range.
     *
     * The duty-compliance audit joins this against the Order Book: an officer
     * assigned investigation duty on a date should have recorded work on that
     * date. Officer-days with none are the audit finding the paper registers
     * structurally cannot produce, because the Order Book and the GCIB are
     * two physically separate volumes.
     *
     * The Order Book side of the join lives off-chain; this is the recorded-work
     * side.
     */
    @Transaction(false)
    @Returns('string')
    public async queryOfficerWork(
        ctx: Context,
        officerId: string,
        fromDate: string,
        toDate: string,
    ): Promise<string> {
        const matches: CaseEvent[] = [];
        const iterator = await ctx.stub.getStateByPartialCompositeKey(EVENT, []);
        let res = await iterator.next();
        while (!res.done) {
            const event = JSON.parse(res.value.value.toString()) as CaseEvent;
            const inRange = event.eventDate >= fromDate && event.eventDate <= toDate;
            if (inRange && event.officerIds.includes(officerId)) {
                matches.push(event);
            }
            res = await iterator.next();
        }
        return JSON.stringify(matches);
    }
}
