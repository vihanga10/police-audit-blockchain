/*
 * CaseEventsService — Principle 2, process-event threading, made real.
 *
 * Same split as complaints: narrative text and officer details live
 * off-chain in PostgreSQL; the ledger anchors a hash of the event record
 * plus the audit-critical facts (type, date, officers, weapon serials).
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { FabricService } from '../fabric/fabric.service';
import { CreateCaseEventDto } from './dto/create-case-event.dto';

function newEventId() {
  return `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Shape returned by the chaincode's queryCaseHistory — see gcibContract.ts.
// Only the field this service actually touches is declared.
interface CaseHistory {
  events: unknown[];
}

@Injectable()
export class CaseEventsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly fabric: FabricService,
  ) {}

  async create(complaintNumber: string, dto: CreateCaseEventDto) {
    // the complaint must exist — an event cannot float unattached.
    // readComplaint() throws if it doesn't, which is exactly what we want
    // here: fail before writing anything, on-chain or off.
    await this.fabric.evaluateTransaction('readComplaint', complaintNumber);

    if (
      dto.eventType === 'INVESTIGATION_RETURN' &&
      !dto.weaponSerialsIn?.length &&
      dto.weaponSerialsOut?.length
    ) {
      throw new BadRequestException(
        'Weapons were carried out but none are recorded as returned',
      );
    }

    const eventId = newEventId();
    // In the finished system this comes from the logged-in officer's
    // certificate, same limitation noted in FabricService.
    const recordingOfficerId = '36355';

    // 1 — off-chain narrative + officer detail
    await this.db.insertCaseEvent({
      eventId,
      complaintNumber,
      eventType: dto.eventType,
      eventDate: dto.eventDate,
      eventTime: dto.eventTime,
      officerIds: dto.officerIds,
      purposeOfVisit: dto.purposeOfVisit,
      weaponSerialsOut: dto.weaponSerialsOut ?? [],
      weaponSerialsIn: dto.weaponSerialsIn ?? [],
      narrativeText: dto.narrativeText,
      attachmentCid: dto.attachmentCid,
      recordingOfficerId,
    });

    // 2 — hash the REAL off-chain row, then thread it to the ledger
    const offChainRecordHash = await this.db.hashCaseEventRecord(eventId);

    await this.fabric.submitTransaction(
      'appendCaseEvent',
      complaintNumber,
      eventId,
      dto.eventType,
      dto.eventDate,
      dto.eventTime,
      JSON.stringify(dto.officerIds),
      JSON.stringify(dto.weaponSerialsOut ?? []),
      JSON.stringify(dto.weaponSerialsIn ?? []),
      offChainRecordHash,
      dto.attachmentCid ?? '',
    );

    return { eventId, complaintNumber, offChainRecordHash };
  }

  async findAllForComplaint(complaintNumber: string) {
    const raw = await this.fabric.evaluateTransaction(
      'queryCaseHistory',
      complaintNumber,
    );
    const parsed = JSON.parse(raw) as CaseHistory;
    return parsed.events;
  }
}
