import { useState } from 'react';
import { fetchCaseHistory, submitCaseEvent } from '../api';
import type { CaseHistory, CaseEvent } from '../types';

const EVENT_LABELS: Record<CaseEvent['eventType'], string> = {
  INVESTIGATION_DEPARTURE: 'Investigation departure',
  INVESTIGATION_FINDING_DETAILS: 'Finding details',
  INVESTIGATION_RETURN: 'Investigation return',
};

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; data: CaseHistory }
  | { status: 'error'; message: string };

interface NewEventForm {
  eventType: CaseEvent['eventType'];
  eventDate: string;
  eventTime: string;
  officerIds: string; // comma-separated in the UI, split on submit
  purposeOfVisit: string;
  weaponSerialsOut: string;
  weaponSerialsIn: string;
  narrativeText: string;
}

const emptyForm = (): NewEventForm => ({
  eventType: 'INVESTIGATION_DEPARTURE',
  eventDate: new Date().toISOString().slice(0, 10),
  eventTime: new Date().toISOString().slice(11, 16),
  officerIds: '36355',
  purposeOfVisit: '',
  weaponSerialsOut: '',
  weaponSerialsIn: '',
  narrativeText: '',
});

function splitList(s: string): string[] {
  return s.split(',').map((x) => x.trim()).filter(Boolean);
}

export default function CaseThread() {
  const [search, setSearch] = useState('');
  const [state, setState] = useState<LoadState>({ status: 'idle' });
  const [form, setForm] = useState<NewEventForm>(emptyForm());
  const [addingEvent, setAddingEvent] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const load = async (complaintNumber: string) => {
    setState({ status: 'loading' });
    try {
      const data = await fetchCaseHistory(complaintNumber);
      setState({ status: 'loaded', data });
    } catch (err) {
      setState({ status: 'error', message: (err as Error).message });
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) load(search.trim());
  };

  const handleAddEvent = async () => {
    if (state.status !== 'loaded') return;
    setAddError(null);
    setAddingEvent(true);
    try {
      await submitCaseEvent({
        complaintNumber: state.data.complaint.complaintNumber,
        eventType: form.eventType,
        eventDate: form.eventDate,
        eventTime: form.eventTime,
        officerIds: splitList(form.officerIds),
        purposeOfVisit: form.purposeOfVisit || undefined,
        weaponSerialsOut: splitList(form.weaponSerialsOut),
        weaponSerialsIn: splitList(form.weaponSerialsIn),
        narrativeText: form.narrativeText || undefined,
      });
      setForm(emptyForm());
      await load(state.data.complaint.complaintNumber); // refresh the thread
    } catch (err) {
      setAddError((err as Error).message);
    } finally {
      setAddingEvent(false);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Case thread</h1>
        <p className="field-hint">
          Everything threaded to one complaint number — the consolidation your paper
          registers could never show in one place.
        </p>
      </header>

      <form className="card search-row" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Complaint number, e.g. MG/2026/0007"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="btn btn-primary">
          Open case
        </button>
      </form>

      {state.status === 'loading' && <p className="field-hint">Loading…</p>}
      {state.status === 'error' && (
        <div className="result-banner error">{state.message}</div>
      )}

      {state.status === 'loaded' && (
        <>
          {/* SEALED COMPLAINT SUMMARY */}
          <section className="card complaint-summary">
            <div className="summary-header">
              <span className="mono complaint-number-big">
                {state.data.complaint.complaintNumber}
              </span>
              {state.data.complaint.isMajorCrime && (
                <span className="tag tag-major">Major crime</span>
              )}
              {state.data.complaint.vulnerableVictim && (
                <span className="tag tag-suggested">Vulnerable victim — restricted</span>
              )}
            </div>
            <div className="grid-2 summary-grid">
              <div>
                <span className="field-label small">Crime type</span>
                <div>{state.data.complaint.crimeType}</div>
              </div>
              <div>
                <span className="field-label small">Category</span>
                <div>{state.data.complaint.category}</div>
              </div>
              <div>
                <span className="field-label small">Crime date/time</span>
                <div>
                  {state.data.complaint.crimeDate} · {state.data.complaint.crimeTime}
                </div>
              </div>
              <div>
                <span className="field-label small">Sealed</span>
                <div className="mono small-mono">{state.data.complaint.sealTimestamp}</div>
              </div>
              <div>
                <span className="field-label small">Recording officer</span>
                <div>
                  {state.data.complaint.recordingOfficerRank} — #
                  {state.data.complaint.recordingOfficerId} (
                  {state.data.complaint.recordingOfficerStation})
                </div>
              </div>
              <div>
                <span className="field-label small">Off-chain record hash</span>
                <div className="mono small-mono hash-trunc">
                  {state.data.complaint.offChainRecordHash}
                </div>
              </div>
            </div>
          </section>

          {/* TIMELINE */}
          <section className="card">
            <h2 className="section-title">Investigation timeline</h2>
            {state.data.events.length === 0 ? (
              <p className="field-hint">No investigation events recorded yet.</p>
            ) : (
              <ol className="timeline">
                {[...state.data.events]
                  .sort((a, b) => (a.sealTimestamp > b.sealTimestamp ? 1 : -1))
                  .map((ev) => (
                    <li key={ev.eventId} className="timeline-item">
                      <div className="timeline-dot" />
                      <div className="timeline-content">
                        <div className="timeline-head">
                          <strong>{EVENT_LABELS[ev.eventType]}</strong>
                          <span className="mono small-mono">
                            {ev.eventDate} · {ev.eventTime}
                          </span>
                        </div>
                        <div className="timeline-meta">
                          Officers: {ev.officerIds.join(', ')}
                          {ev.purposeOfVisit && <> — {ev.purposeOfVisit}</>}
                        </div>
                        {ev.weaponSerialsOut.length > 0 && (
                          <div className="timeline-meta">
                            Weapons carried: {ev.weaponSerialsOut.join(', ')}
                          </div>
                        )}
                        {ev.weaponSerialsIn.length > 0 && (
                          <div className="timeline-meta">
                            Weapons returned: {ev.weaponSerialsIn.join(', ')}
                          </div>
                        )}
                        <div className="mono small-mono hash-trunc timeline-hash">
                          hash {ev.offChainRecordHash}
                        </div>
                      </div>
                    </li>
                  ))}
              </ol>
            )}
          </section>

          {/* ADD EVENT */}
          <section className="card">
            <h2 className="section-title">Add investigation event</h2>
            <div className="grid-2">
              <div className="field-block">
                <label className="field-label">Event type</label>
                <select
                  value={form.eventType}
                  onChange={(e) =>
                    setForm({ ...form, eventType: e.target.value as CaseEvent['eventType'] })
                  }
                >
                  <option value="INVESTIGATION_DEPARTURE">Investigation departure</option>
                  <option value="INVESTIGATION_FINDING_DETAILS">Finding details</option>
                  <option value="INVESTIGATION_RETURN">Investigation return</option>
                </select>
              </div>
              <div className="field-block">
                <label className="field-label">Officers (comma-separated IDs)</label>
                <input
                  type="text"
                  value={form.officerIds}
                  onChange={(e) => setForm({ ...form, officerIds: e.target.value })}
                />
              </div>
            </div>
            <div className="grid-2">
              <div className="field-block">
                <label className="field-label">Date</label>
                <input
                  type="date"
                  value={form.eventDate}
                  onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                />
              </div>
              <div className="field-block">
                <label className="field-label">Time</label>
                <input
                  type="time"
                  value={form.eventTime}
                  onChange={(e) => setForm({ ...form, eventTime: e.target.value })}
                />
              </div>
            </div>

            {form.eventType === 'INVESTIGATION_DEPARTURE' && (
              <div className="field-block">
                <label className="field-label">Purpose of visit</label>
                <input
                  type="text"
                  value={form.purposeOfVisit}
                  onChange={(e) => setForm({ ...form, purposeOfVisit: e.target.value })}
                />
              </div>
            )}

            <div className="grid-2">
              <div className="field-block">
                <label className="field-label small">Weapon serials carried (comma-separated)</label>
                <input
                  type="text"
                  value={form.weaponSerialsOut}
                  onChange={(e) => setForm({ ...form, weaponSerialsOut: e.target.value })}
                  placeholder="WR/MG/0112"
                />
              </div>
              <div className="field-block">
                <label className="field-label small">Weapon serials returned (comma-separated)</label>
                <input
                  type="text"
                  value={form.weaponSerialsIn}
                  onChange={(e) => setForm({ ...form, weaponSerialsIn: e.target.value })}
                  placeholder="WR/MG/0112"
                />
              </div>
            </div>

            <label className="field-label">Narrative</label>
            <textarea
              rows={4}
              value={form.narrativeText}
              onChange={(e) => setForm({ ...form, narrativeText: e.target.value })}
              placeholder="What happened at this stage of the investigation?"
            />

            <div className="save-bar">
              <button
                type="button"
                className="btn btn-primary"
                disabled={addingEvent}
                onClick={handleAddEvent}
              >
                🔒 {addingEvent ? 'Sealing…' : 'Seal event to ledger'}
              </button>
            </div>
            {addError && <div className="result-banner error">{addError}</div>}
          </section>
        </>
      )}
    </div>
  );
}
