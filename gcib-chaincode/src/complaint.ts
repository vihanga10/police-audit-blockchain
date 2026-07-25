/*
 * GCIB Chaincode — on-ledger data models
 * SPDX-License-Identifier: Apache-2.0
 *
 * WHAT LIVES HERE AND WHAT DOES NOT
 * ---------------------------------
 * Only audit facts, hashes and references go on the ledger.
 * Personal data (victim/complainant/witness names, NIC numbers,
 * addresses, contact numbers, statement text, crime scene
 * coordinates) is held off-chain in PostgreSQL so it remains
 * correctable and erasable under Sri Lanka PDPA No. 9 of 2022.
 *
 * The ledger anchors a hash of the off-chain record, so off-chain
 * data cannot be silently altered even though it is not stored here.
 */

import {Object, Property} from 'fabric-contract-api';

/**
 * Statement — anchored at CAPTURE time, before the complaint exists.
 *
 * This is Principle 1 (capture-time integrity anchoring). The moment the
 * officer stops recording, the audio hash is written to the ledger. The
 * officer then types the statement; because the audio was already anchored,
 * the typed text remains forever verifiable against the victim's original
 * account.
 *
 * A statement is created BEFORE its complaint, so it carries its own id
 * rather than a complaint number. The complaint references it afterwards.
 */
@Object()
export class Statement {
    @Property()
    public docType = 'statement';

    @Property()
    public statementId = '';

    /** VICTIM | COMPLAINANT | WITNESS */
    @Property()
    public statementRole = '';

    /** SHA-256 of the original audio file. Empty when no audio was captured. */
    @Property()
    public audioHash = '';

    /** IPFS CID of the encrypted audio. Empty when no audio was captured. */
    @Property()
    public audioCID = '';

    /**
     * Recorded reason when no audio exists — e.g. complainant declined,
     * equipment failure. Never leave audio absence unexplained: a silent
     * empty field cannot be distinguished from an error.
     */
    @Property()
    public noAudioReason = '';

    /** Ledger-assigned. Set from getTxTimestamp(), never from the client. */
    @Property()
    public captureTimestamp = '';

    /** From the officer's X.509 certificate, never from a parameter. */
    @Property()
    public capturingOfficerId = '';

    @Property()
    public stationCode = '';

    /** Set once the statement is attached to a sealed complaint. */
    @Property()
    public complaintNumber = '';
}

/**
 * Complaint — the sealed GCIB entry.
 *
 * Equivalent to one row of complaints.csv, minus everything that is
 * personal data. Sealed when the officer clicks "Save & seal to ledger".
 */
@Object()
export class Complaint {
    @Property()
    public docType = 'complaint';

    /** StationCode/Year/Sequential — e.g. MG/2025/0148. The consolidation key. */
    @Property()
    public complaintNumber = '';

    @Property()
    public stationCode = '';

    @Property()
    public crimeType = '';

    /** PERSON | PROPERTY | GOVERNMENT */
    @Property()
    public category = '';

    @Property()
    public isMajorCrime = false;

    /** When the crime occurred (not when it was reported). */
    @Property()
    public crimeDate = '';

    @Property()
    public crimeTime = '';

    /** 0–23, derived from crimeTime. Kept on-chain for the crime clock. */
    @Property()
    public crimeHour = 0;

    /**
     * SHA-256 of the full off-chain record held in PostgreSQL: victim and
     * witness details, statement text, crime scene address and coordinates.
     * Anchoring the hash keeps that data tamper-evident without placing
     * personal data on an immutable ledger.
     */
    @Property()
    public offChainRecordHash = '';

    /** Statement ids anchored at capture time, in capture order. */
    @Property()
    public statementIds: string[] = [];

    /**
     * True when the crime scene pin was positioned by the officer rather than
     * left at an automated geocode guess. Distinguishes confirmed locations
     * from unverified ones.
     */
    @Property()
    public locationConfirmedByOfficer = false;

    /**
     * The officer's assertion that the statement was read back to the
     * complainant and accurately reflects what they said. Sealed as part of
     * the record because it is an accountability claim, not a UI checkbox.
     */
    @Property()
    public statementReadBackConfirmed = false;

    /**
     * Set when the victim is a minor or the offence is sexual, or added
     * manually by the officer. Once set it cannot be removed. Restricts who
     * may read the off-chain personal data; enforced in PostgreSQL, which is
     * only possible because personal data was kept off the ledger.
     */
    @Property()
    public vulnerableVictim = false;

    /** From the officer's certificate at seal time — never a parameter. */
    @Property()
    public recordingOfficerId = '';

    /**
     * Rank and station as they were TRUE AT SEAL TIME. Deliberately
     * denormalised: the officer will be promoted and transferred, but this
     * record must always describe who they were when they wrote it.
     */
    @Property()
    public recordingOfficerRank = '';

    @Property()
    public recordingOfficerStation = '';

    /** Ledger-assigned, authoritative, immutable. */
    @Property()
    public sealTimestamp = '';

    /** 1 for the original. Corrections append a new version, never overwrite. */
    @Property()
    public version = 1;

    /** Ledger key of the previous version. Empty on the original. */
    @Property()
    public prevVersionId = '';

    /** Why this version was created. Empty on the original. */
    @Property()
    public amendmentReason = '';
}
