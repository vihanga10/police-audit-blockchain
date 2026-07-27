/**
 * Shape posted to record an investigation event — a departure, a finding,
 * or a return, threaded to an existing complaint by complaintNumber.
 * This is Principle 2, process-event threading, as an HTTP request.
 *
 * NOTE: complaintNumber lives in the body, not the URL path. Complaint
 * numbers contain slashes (MG/2026/0007), which breaks path-based routing
 * unless every client remembers to URL-encode them — putting it in the
 * body sidesteps that gotcha entirely.
 */
export class CreateCaseEventDto {
  complaintNumber!: string;
  eventType!:
    | 'INVESTIGATION_DEPARTURE'
    | 'INVESTIGATION_FINDING_DETAILS'
    | 'INVESTIGATION_RETURN';
  eventDate!: string; // YYYY-MM-DD
  eventTime!: string; // HH:MM
  officerIds!: string[];
  purposeOfVisit?: string;

  weaponSerialsOut?: string[];
  weaponSerialsIn?: string[];

  narrativeText?: string;
  attachmentCid?: string; // encrypted sketch/photo, if any
}
