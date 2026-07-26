/**
 * Shape of what the React complaint form (as designed) posts to the backend.
 *
 * First version: one victim, one statement. Multiple victims/witnesses,
 * each with their own anchored statement, extend this the same way —
 * this DTO is deliberately the simplest complete slice, not the final
 * shape.
 */
export class CreateComplaintDto {
  stationCode!: string;
  crimeType!: string;
  category!: string;
  isMajorCrime!: boolean;
  complaintTitle?: string;

  crimeDate!: string; // YYYY-MM-DD
  crimeTime!: string; // HH:MM
  crimeLocation?: string;
  crimeLatitude?: number;
  crimeLongitude?: number;
  locationConfirmedByOfficer!: boolean;

  // COMPLAINANT — victim-self vs on-behalf, per the form's toggle
  reportingMode!: 'VICTIM_SELF' | 'COMPLAINANT_ON_BEHALF';
  complainant?: {
    fullName: string;
    nicNo?: string;
    contactNumber?: string;
    relationshipToVictim?: string;
  };

  victim!: {
    fullName: string;
    nicNo?: string;
    dateOfBirth?: string;
    gender?: string;
    address?: string;
    contactNumber?: string;
  };

  // Auto-derived by the backend from crime type / victim age — the form
  // may also set this manually, but never unset it once true.
  vulnerableVictim!: boolean;

  // STATEMENT — anchored at capture, before this complaint is sealed
  statement!: {
    statementId: string; // generated client-side when recording starts
    text: string;
    audioHash?: string;
    audioCid?: string;
    noAudioReason?: string;
    readBackConfirmed: boolean;
    captureTimestamp: string; // when the officer stopped recording
  };
}
