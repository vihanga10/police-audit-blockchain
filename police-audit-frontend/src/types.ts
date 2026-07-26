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