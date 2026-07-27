export interface ComplaintPayload {
  stationCode: string;
  crimeType: string;
  category: string;
  isMajorCrime: boolean;
  complaintTitle?: string;
  crimeDate: string;
  crimeTime: string;
  crimeLocation?: string;
  crimeLatitude?: number;
  crimeLongitude?: number;
  locationConfirmedByOfficer: boolean;
  reportingMode: 'VICTIM_SELF' | 'COMPLAINANT_ON_BEHALF';
  complainant?: {
    fullName: string;
    nicNo?: string;
    contactNumber?: string;
    relationshipToVictim?: string;
  };
  victim: {
    fullName: string;
    nicNo?: string;
    dateOfBirth?: string;
    gender?: string;
    address?: string;
    contactNumber?: string;
  };
  vulnerableVictim: boolean;
  statement: {
    statementId: string;
    text: string;
    audioHash?: string;
    audioCid?: string;
    noAudioReason?: string;
    readBackConfirmed: boolean;
    captureTimestamp: string;
  };
}

export interface Witness {
  fullName: string;
  nicNo: string;
  dateOfBirth: string;
  gender: string;
  contactNumber: string;
  address: string;
  account: string;
}

// ── case thread ──────────────────────────────────────────────

export interface CaseEvent {
  eventId: string;
  complaintNumber: string;
  eventType: 'INVESTIGATION_DEPARTURE' | 'INVESTIGATION_FINDING_DETAILS' | 'INVESTIGATION_RETURN';
  eventDate: string;
  eventTime: string;
  officerIds: string[];
  purposeOfVisit?: string;
  weaponSerialsOut: string[];
  weaponSerialsIn: string[];
  offChainRecordHash: string;
  attachmentCID: string;
  recordingOfficerId: string;
  recordingOfficerRank: string;
  recordingOfficerStation: string;
  sealTimestamp: string;
}

export interface ComplaintRecord {
  complaintNumber: string;
  stationCode: string;
  crimeType: string;
  category: string;
  isMajorCrime: boolean;
  crimeDate: string;
  crimeTime: string;
  crimeHour: number;
  offChainRecordHash: string;
  statementIds: string[];
  locationConfirmedByOfficer: boolean;
  statementReadBackConfirmed: boolean;
  vulnerableVictim: boolean;
  recordingOfficerId: string;
  recordingOfficerRank: string;
  recordingOfficerStation: string;
  sealTimestamp: string;
  version: number;
}

export interface CaseHistory {
  complaint: ComplaintRecord;
  versionTrail: ComplaintRecord[];
  statements: unknown[];
  events: CaseEvent[];
}

export interface CaseEventPayload {
  complaintNumber: string;
  eventType: CaseEvent['eventType'];
  eventDate: string;
  eventTime: string;
  officerIds: string[];
  purposeOfVisit?: string;
  weaponSerialsOut?: string[];
  weaponSerialsIn?: string[];
  narrativeText?: string;
  attachmentCid?: string;
}