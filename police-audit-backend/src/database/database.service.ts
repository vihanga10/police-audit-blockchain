/*
 * DatabaseService — the off-chain half of the on-chain/off-chain split.
 *
 * Everything that is personal data (names, NIC numbers, addresses, contact
 * numbers, statement text, crime scene coordinates) lives here in
 * PostgreSQL, not on the ledger. This keeps it correctable and erasable
 * under Sri Lanka PDPA No. 9 of 2022.
 *
 * The ledger only ever sees a SHA-256 hash of the relevant row(s) here —
 * see hashComplaintRecord() below, which does exactly what was done by
 * hand at the psql prompt: pull the row as JSON, hash it, hand the hash
 * to the chaincode.
 */

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { createHash } from 'crypto';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool = new Pool({
    // Overridable via env vars; defaults match local dev setup.
    database: process.env.PGDATABASE ?? 'police_audit_db',
    host: process.env.PGHOST ?? 'localhost',
    port: Number(process.env.PGPORT ?? 5432),
    user: process.env.PGUSER ?? undefined,
  });

  async onModuleDestroy() {
    await this.pool.end();
  }

  // ── complaint numbering ─────────────────────────────────────

  /**
   * Atomic complaint-number generator: StationCode/Year/Sequential.
   * ON CONFLICT ... DO UPDATE under one round trip avoids the race
   * condition of two officers at the same station saving simultaneously —
   * the increment happens inside PostgreSQL, not in application code.
   *
   * Requires a counters table (create once):
   *   CREATE TABLE complaint_counters (
   *     station_code VARCHAR(10) NOT NULL,
   *     year         INTEGER NOT NULL,
   *     last_seq     INTEGER NOT NULL DEFAULT 0,
   *     PRIMARY KEY (station_code, year)
   *   );
   */
  async nextComplaintNumber(stationCode: string, year: number): Promise<string> {
    const res = await this.pool.query(
      `INSERT INTO complaint_counters (station_code, year, last_seq)
       VALUES ($1, $2, 1)
       ON CONFLICT (station_code, year)
       DO UPDATE SET last_seq = complaint_counters.last_seq + 1
       RETURNING last_seq`,
      [stationCode, year],
    );
    const seq = res.rows[0].last_seq as number;
    return `${stationCode}/${year}/${seq.toString().padStart(4, '0')}`;
  }

  // ── complaints ──────────────────────────────────────────────

  async insertComplaint(c: {
    complaintNumber: string;
    stationCode: string;
    crimeType: string;
    category: string;
    isMajorCrime: boolean;
    complaintTitle?: string;
    crimeDate: string;
    crimeTime: string;
    crimeHour: number;
    crimeLocation?: string;
    crimeLatitude?: number;
    crimeLongitude?: number;
    locationConfirmedByOfficer: boolean;
    entryDate: string;
    entryTime: string;
    recordingOfficerId: string;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO complaints (
        complaint_number, station_code, crime_type, category, is_major_crime,
        complaint_title, crime_date, crime_time, crime_hour, crime_location,
        crime_latitude, crime_longitude, location_confirmed_by_officer,
        entry_date, entry_time, recording_officer_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [
        c.complaintNumber, c.stationCode, c.crimeType, c.category, c.isMajorCrime,
        c.complaintTitle ?? null, c.crimeDate, c.crimeTime, c.crimeHour, c.crimeLocation ?? null,
        c.crimeLatitude ?? null, c.crimeLongitude ?? null, c.locationConfirmedByOfficer,
        c.entryDate, c.entryTime, c.recordingOfficerId,
      ],
    );
  }

  /**
   * The exact mechanism proven by hand at the psql prompt: pull the
   * complaint back as JSON, in a stable field order, and SHA-256 it.
   * This is what gets sent to recordComplaint() as offChainRecordHash.
   *
   * Field order matters — row_to_json() is deterministic for a given
   * table definition, so this is safe to hash directly.
   */
  async hashComplaintRecord(complaintNumber: string): Promise<string> {
    const res = await this.pool.query(
      `SELECT row_to_json(complaints) AS doc
       FROM complaints WHERE complaint_number = $1`,
      [complaintNumber],
    );
    if (res.rows.length === 0) {
      throw new Error(`No complaint ${complaintNumber} found to hash`);
    }
    const json = JSON.stringify(res.rows[0].doc);
    return createHash('sha256').update(json).digest('hex');
  }

  // ── persons ─────────────────────────────────────────────────

  async insertPerson(p: {
    personId: string;
    complaintNumber: string;
    role: string;
    fullName?: string;
    nicNo?: string;
    dateOfBirth?: string;
    gender?: string;
    address?: string;
    contactNumber?: string;
    relationshipToVictim?: string;
    isVulnerable: boolean;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO persons (
        person_id, complaint_number, role, full_name, nic_no, date_of_birth,
        gender, address, contact_number, relationship_to_victim, is_vulnerable
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        p.personId, p.complaintNumber, p.role, p.fullName ?? null, p.nicNo ?? null,
        p.dateOfBirth ?? null, p.gender ?? null, p.address ?? null,
        p.contactNumber ?? null, p.relationshipToVictim ?? null, p.isVulnerable,
      ],
    );
  }

  // ── statements ──────────────────────────────────────────────

  async insertStatement(s: {
    statementId: string;
    complaintNumber: string | null;
    personId: string;
    statementRole: string;
    statementText?: string;
    audioHash?: string;
    audioCid?: string;
    noAudioReason?: string;
    readBackConfirmed: boolean;
    captureTimestamp: string;
    capturingOfficerId: string;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO statements (
        statement_id, complaint_number, person_id, statement_role, statement_text,
        audio_hash, audio_cid, no_audio_reason, read_back_confirmed,
        capture_timestamp, capturing_officer_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        s.statementId, s.complaintNumber, s.personId, s.statementRole,
        s.statementText ?? null, s.audioHash ?? null, s.audioCid ?? null,
        s.noAudioReason ?? null, s.readBackConfirmed, s.captureTimestamp,
        s.capturingOfficerId,
      ],
    );
  }

  /** Links a previously-anchored statement to the complaint that now references it. */
  async attachStatementToComplaint(statementId: string, complaintNumber: string): Promise<void> {
    await this.pool.query(
      `UPDATE statements SET complaint_number = $1 WHERE statement_id = $2`,
      [complaintNumber, statementId],
    );
  }
}
