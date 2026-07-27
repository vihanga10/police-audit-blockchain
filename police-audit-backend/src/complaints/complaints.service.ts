/*
 * ComplaintsService — orchestrates the split proven by hand earlier:
 *
 *   1. Write personal data to PostgreSQL (off-chain).
 *   2. Anchor the statement's audio hash on the ledger (capture-time
 *      anchoring — Principle 1).
 *   3. Compute a SHA-256 hash of the PostgreSQL complaint row.
 *   4. Seal the complaint on the ledger, carrying that hash and the
 *      statement id, never the personal data itself.
 *
 * PROTOTYPE SIMPLIFICATION, stated plainly: this endpoint anchors the
 * statement and seals the complaint in the same request. The framework's
 * true timing anchors the statement the moment the officer stops
 * recording — earlier than "save & seal". The natural next refinement is
 * splitting this into POST /statements/capture (called at record-stop)
 * and POST /complaints (called at save & seal, referencing the
 * already-anchored statement id). Combining them here is a reasonable
 * first step to prove the whole pipeline, not the final design.
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { FabricService } from '../fabric/fabric.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';

// Crime types where the victim is treated as vulnerable regardless of the
// form's own flag. Mirrors the rule described for the UI: auto-set, never
// auto-unset. ct10/11/14 = rape & unnatural offences, ct20/21 = child
// cruelty & exploitation, ct22 = trafficking.
const VULNERABLE_CRIME_TYPES = new Set([
  'ct10',
  'ct11',
  'ct14',
  'ct20',
  'ct21',
  'ct22',
]);

@Injectable()
export class ComplaintsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly fabric: FabricService,
  ) {}

  async create(dto: CreateComplaintDto) {
    if (!dto.statement.audioHash && !dto.statement.noAudioReason) {
      throw new BadRequestException(
        'Either an audio recording or a stated reason for its absence is required',
      );
    }

    const year = new Date().getFullYear();
    const complaintNumber = await this.db.nextComplaintNumber(
      dto.stationCode,
      year,
    );

    const isAgeVulnerable = dto.victim.dateOfBirth
      ? this.isMinor(dto.victim.dateOfBirth)
      : false;
    const vulnerableVictim =
      dto.vulnerableVictim ||
      VULNERABLE_CRIME_TYPES.has(dto.crimeType) ||
      isAgeVulnerable;

    const crimeHour = Number(dto.crimeTime.split(':')[0]);
    const now = new Date();
    const entryDate = now.toISOString().slice(0, 10);
    const entryTime = now.toISOString().slice(11, 16);

    // In the finished system this comes from the logged-in officer's
    // certificate. See the limitation noted in FabricService.
    const recordingOfficerId = '36355';

    // 1 — draft complaint row, off-chain
    await this.db.insertComplaint({
      complaintNumber,
      stationCode: dto.stationCode,
      crimeType: dto.crimeType,
      category: dto.category,
      isMajorCrime: dto.isMajorCrime,
      complaintTitle: dto.complaintTitle,
      crimeDate: dto.crimeDate,
      crimeTime: dto.crimeTime,
      crimeHour,
      crimeLocation: dto.crimeLocation,
      crimeLatitude: dto.crimeLatitude,
      crimeLongitude: dto.crimeLongitude,
      locationConfirmedByOfficer: dto.locationConfirmedByOfficer,
      entryDate,
      entryTime,
      recordingOfficerId,
    });

    // 2 — victim (and complainant, if reporting on behalf), off-chain
    const victimPersonId = `${complaintNumber}-V1`;
    await this.db.insertPerson({
      personId: victimPersonId,
      complaintNumber,
      role: dto.reportingMode,
      fullName: dto.victim.fullName,
      nicNo: dto.victim.nicNo,
      dateOfBirth: dto.victim.dateOfBirth,
      gender: dto.victim.gender,
      address: dto.victim.address,
      contactNumber: dto.victim.contactNumber,
      isVulnerable: vulnerableVictim,
    });

    if (dto.reportingMode === 'COMPLAINANT_ON_BEHALF' && dto.complainant) {
      await this.db.insertPerson({
        personId: `${complaintNumber}-C1`,
        complaintNumber,
        role: 'COMPLAINANT_ON_BEHALF',
        fullName: dto.complainant.fullName,
        nicNo: dto.complainant.nicNo,
        contactNumber: dto.complainant.contactNumber,
        relationshipToVictim: dto.complainant.relationshipToVictim,
        isVulnerable: false,
      });
    }

    // 3 — anchor the statement on the ledger BEFORE it is referenced by
    // the complaint. This is Principle 1 made real: the officer's typed
    // text (below, off-chain) becomes checkable against this anchor
    // forever.
    await this.fabric.submitTransaction(
      'captureStatement',
      dto.statement.statementId,
      'VICTIM',
      dto.statement.audioHash ?? '',
      dto.statement.audioCid ?? '',
      dto.statement.noAudioReason ?? '',
    );

    await this.db.insertStatement({
      statementId: dto.statement.statementId,
      complaintNumber,
      personId: victimPersonId,
      statementRole: 'VICTIM',
      statementText: dto.statement.text,
      audioHash: dto.statement.audioHash,
      audioCid: dto.statement.audioCid,
      noAudioReason: dto.statement.noAudioReason,
      readBackConfirmed: dto.statement.readBackConfirmed,
      captureTimestamp: dto.statement.captureTimestamp,
      capturingOfficerId: recordingOfficerId,
    });

    // 4 — hash the REAL off-chain row (not a placeholder) and seal
    const offChainRecordHash =
      await this.db.hashComplaintRecord(complaintNumber);

    await this.fabric.submitTransaction(
      'recordComplaint',
      complaintNumber,
      dto.crimeType,
      dto.category,
      String(dto.isMajorCrime),
      dto.crimeDate,
      dto.crimeTime,
      String(crimeHour),
      offChainRecordHash,
      JSON.stringify([dto.statement.statementId]),
      String(dto.locationConfirmedByOfficer),
      String(dto.statement.readBackConfirmed),
      String(vulnerableVictim),
    );

    return {
      complaintNumber,
      offChainRecordHash,
      vulnerableVictim,
    };
  }

  async findOne(complaintNumber: string) {
    const raw = await this.fabric.evaluateTransaction(
      'queryCaseHistory',
      complaintNumber,
    );
    return JSON.parse(raw) as Record<string, unknown>;
  }

  private isMinor(dateOfBirth: string): boolean {
    const dob = new Date(dateOfBirth);
    const ageMs = Date.now() - dob.getTime();
    const ageYears = ageMs / (1000 * 60 * 60 * 24 * 365.25);
    return ageYears < 18;
  }
}
