import { useState } from 'react';
import CrimeSceneMap from './CrimeSceneMap';
import StatementRecorder, { type StatementValue } from './StatementRecorder';
import { CRIME_TYPES, VULNERABLE_CODES } from '../crimeTypes';
import { submitComplaint } from '../api';
import type { ComplaintPayload, Witness } from '../types';

// In the finished system this comes from the logged-in officer's own
// station via their certificate. Hardcoded here to match the officer
// already enrolled in Fabric CA for this vertical slice.
const STATION_CODE = 'MG';

function newStatementId() {
  return `STMT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const emptyStatement = (): StatementValue => ({
  statementId: newStatementId(),
  text: '',
  audioHash: '',
  audioCid: '',
  noAudioReason: '',
  readBackConfirmed: false,
  captureTimestamp: '',
});

const emptyWitness = (): Witness => ({
  fullName: '',
  nicNo: '',
  dateOfBirth: '',
  gender: 'Female',
  contactNumber: '',
  address: '',
  account: '',
});

type Result =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'success'; complaintNumber: string; hash: string }
  | { status: 'error'; message: string };

export default function ComplaintForm() {
  // ── classify ──
  const [complaintTitle, setComplaintTitle] = useState('');
  const [crimeType, setCrimeType] = useState(CRIME_TYPES[4].code); // ct05 default
  const [crimeDate, setCrimeDate] = useState('');
  const [crimeTime, setCrimeTime] = useState('');

  // ── crime scene ──
  const [crimeLocation, setCrimeLocation] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number; confirmed: boolean }>({
    lat: 0,
    lng: 0,
    confirmed: false,
  });

  // ── complainant / victim ──
  const [reportingMode, setReportingMode] = useState<'VICTIM_SELF' | 'COMPLAINANT_ON_BEHALF'>(
    'VICTIM_SELF',
  );
  const [complainant, setComplainant] = useState({
    fullName: '',
    nicNo: '',
    contactNumber: '',
    relationshipToVictim: '',
  });
  const [victim, setVictim] = useState({
    fullName: '',
    nicNo: '',
    dateOfBirth: '',
    gender: 'Female',
    address: '',
    contactNumber: '',
  });
  const [vulnerableManual, setVulnerableManual] = useState(false);

  // ── statement ──
  const [statement, setStatement] = useState<StatementValue>(emptyStatement());

  // ── witnesses ──
  const [witnesses, setWitnesses] = useState<Witness[]>([]);

  const [result, setResult] = useState<Result>({ status: 'idle' });

  const selectedType = CRIME_TYPES.find((c) => c.code === crimeType)!;
  const autoVulnerable = VULNERABLE_CODES.has(crimeType);
  const isVulnerable = autoVulnerable || vulnerableManual;

  const addWitness = () => setWitnesses((w) => [...w, emptyWitness()]);
  const removeWitness = (i: number) => setWitnesses((w) => w.filter((_, idx) => idx !== i));
  const updateWitness = (i: number, patch: Partial<Witness>) =>
    setWitnesses((w) => w.map((wit, idx) => (idx === i ? { ...wit, ...patch } : wit)));

  const handleSubmit = async (seal: boolean) => {
    if (!seal) {
      // "Save as draft" keeps everything in the browser only for this
      // prototype slice — no draft-persistence endpoint exists yet.
      alert('Draft kept in this form only for now — no draft-storage endpoint yet.');
      return;
    }

    if (!statement.audioHash && !statement.noAudioReason) {
      setResult({
        status: 'error',
        message: 'Record the statement or give a reason no recording was made.',
      });
      return;
    }

    const payload: ComplaintPayload = {
      stationCode: STATION_CODE,
      crimeType,
      category: selectedType.category,
      isMajorCrime: selectedType.isMajor,
      complaintTitle: complaintTitle || undefined,
      crimeDate,
      crimeTime,
      crimeLocation: crimeLocation || undefined,
      crimeLatitude: coords.lat || undefined,
      crimeLongitude: coords.lng || undefined,
      locationConfirmedByOfficer: coords.confirmed,
      reportingMode,
      complainant: reportingMode === 'COMPLAINANT_ON_BEHALF' ? complainant : undefined,
      victim,
      vulnerableVictim: isVulnerable,
      statement: {
        statementId: statement.statementId,
        text: statement.text,
        audioHash: statement.audioHash || undefined,
        audioCid: statement.audioCid || undefined,
        noAudioReason: statement.noAudioReason || undefined,
        readBackConfirmed: statement.readBackConfirmed,
        captureTimestamp: statement.captureTimestamp || new Date().toISOString(),
      },
    };

    setResult({ status: 'saving' });
    try {
      const res = await submitComplaint(payload);
      setResult({ status: 'success', complaintNumber: res.complaintNumber, hash: res.offChainRecordHash });
    } catch (err) {
      setResult({ status: 'error', message: (err as Error).message });
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Record original complaint</h1>
        <p className="mono complaint-number-preview">
          Complaint number assigned on save — station {STATION_CODE}
        </p>
      </header>

      {/* 1 — CLASSIFY */}
      <section className="card">
        <h2 className="section-title">1 · Classify the complaint</h2>
        <div className="field-block">
          <label className="field-label">Complaint title / subject</label>
          <input
            type="text"
            value={complaintTitle}
            onChange={(e) => setComplaintTitle(e.target.value)}
            placeholder="Short subject line"
          />
        </div>
        <div className="grid-2">
          <div className="field-block">
            <label className="field-label">Crime type <span className="req">*</span></label>
            <select value={crimeType} onChange={(e) => setCrimeType(e.target.value)}>
              {CRIME_TYPES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.labelEn} — {c.labelSi}
                </option>
              ))}
            </select>
          </div>
          <div className="field-block">
            <label className="field-label">Category</label>
            <input type="text" readOnly value={selectedType.category} className="readonly" />
          </div>
        </div>
        {selectedType.isMajor && (
          <div className="tag tag-major">Major crime — reportable to HQ</div>
        )}
      </section>

      {/* 2 — CRIME SCENE */}
      <section className="card">
        <h2 className="section-title">2 · Crime scene — location &amp; time</h2>
        <div className="grid-2">
          <div className="field-block">
            <label className="field-label">Date the crime occurred <span className="req">*</span></label>
            <input type="date" value={crimeDate} onChange={(e) => setCrimeDate(e.target.value)} />
          </div>
          <div className="field-block">
            <label className="field-label">Time the crime occurred <span className="req">*</span></label>
            <input type="time" value={crimeTime} onChange={(e) => setCrimeTime(e.target.value)} />
          </div>
        </div>
        <input
          type="text"
          value={crimeLocation}
          onChange={(e) => setCrimeLocation(e.target.value)}
          placeholder="අංක 45, කොට්ටාව පාර, මහරගම"
          className="address-input"
        />
        <CrimeSceneMap
          address={crimeLocation}
          onLocationChange={(lat, lng, confirmedByOfficer) =>
            setCoords({ lat, lng, confirmed: confirmedByOfficer })
          }
        />
      </section>

      {/* 3 — COMPLAINANT */}
      <section className="card">
        <h2 className="section-title">3 · Complainant</h2>
        <div className="toggle-row">
          <button
            type="button"
            className={reportingMode === 'VICTIM_SELF' ? 'toggle active' : 'toggle'}
            onClick={() => setReportingMode('VICTIM_SELF')}
          >
            Victim is reporting themselves
          </button>
          <button
            type="button"
            className={reportingMode === 'COMPLAINANT_ON_BEHALF' ? 'toggle active' : 'toggle'}
            onClick={() => setReportingMode('COMPLAINANT_ON_BEHALF')}
          >
            Reporting on behalf of the victim
          </button>
        </div>

        {reportingMode === 'COMPLAINANT_ON_BEHALF' && (
          <div className="sub-card">
            <div className="grid-2">
              <div className="field-block">
                <label className="field-label">Complainant's name <span className="req">*</span></label>
                <input
                  type="text"
                  value={complainant.fullName}
                  onChange={(e) => setComplainant({ ...complainant, fullName: e.target.value })}
                />
              </div>
              <div className="field-block">
                <label className="field-label">Relationship to victim</label>
                <input
                  type="text"
                  value={complainant.relationshipToVictim}
                  onChange={(e) =>
                    setComplainant({ ...complainant, relationshipToVictim: e.target.value })
                  }
                  placeholder="පියා (Father)"
                />
              </div>
            </div>
            <div className="grid-2">
              <div className="field-block">
                <label className="field-label">NIC number</label>
                <input
                  type="text"
                  value={complainant.nicNo}
                  onChange={(e) => setComplainant({ ...complainant, nicNo: e.target.value })}
                />
              </div>
              <div className="field-block">
                <label className="field-label">Contact number</label>
                <input
                  type="text"
                  value={complainant.contactNumber}
                  onChange={(e) =>
                    setComplainant({ ...complainant, contactNumber: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* VICTIM DETAILS */}
      <section className="card">
        <h2 className="section-title">Victim details</h2>
        <div className="grid-2">
          <div className="field-block">
            <label className="field-label">Full name <span className="req">*</span></label>
            <input
              type="text"
              value={victim.fullName}
              onChange={(e) => setVictim({ ...victim, fullName: e.target.value })}
            />
          </div>
          <div className="field-block">
            <label className="field-label">NIC number</label>
            <input
              type="text"
              value={victim.nicNo}
              onChange={(e) => setVictim({ ...victim, nicNo: e.target.value })}
            />
          </div>
        </div>
        <div className="grid-2">
          <div className="field-block">
            <label className="field-label">Date of birth</label>
            <input
              type="date"
              value={victim.dateOfBirth}
              onChange={(e) => setVictim({ ...victim, dateOfBirth: e.target.value })}
            />
          </div>
          <div className="field-block">
            <label className="field-label">Gender</label>
            <select value={victim.gender} onChange={(e) => setVictim({ ...victim, gender: e.target.value })}>
              <option>Female</option>
              <option>Male</option>
              <option>Other</option>
            </select>
          </div>
        </div>
        <div className="grid-2">
          <div className="field-block">
            <label className="field-label">Contact number</label>
            <input
              type="text"
              value={victim.contactNumber}
              onChange={(e) => setVictim({ ...victim, contactNumber: e.target.value })}
            />
          </div>
          <div className="field-block">
            <label className="field-label">Address</label>
            <input
              type="text"
              value={victim.address}
              onChange={(e) => setVictim({ ...victim, address: e.target.value })}
            />
          </div>
        </div>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={isVulnerable}
            disabled={autoVulnerable}
            onChange={(e) => setVulnerableManual(e.target.checked)}
          />
          Flag as a vulnerable victim (minor / sexual-offence case) — restricts who can view
          these details
          {autoVulnerable && <span className="tag tag-auto">auto-set by crime type</span>}
        </label>
      </section>

      {/* 4 — STATEMENT */}
      <section className="card">
        <h2 className="section-title">4 · Statement of the complaint — in the victim's own words</h2>
        <StatementRecorder label="Victim / complainant statement" value={statement} onChange={setStatement} />
      </section>

      {/* 5 — WITNESSES */}
      <section className="card">
        <h2 className="section-title">5 · Witnesses <span className="optional">— optional</span></h2>
        {witnesses.map((w, i) => (
          <div className="sub-card" key={i}>
            <div className="sub-card-header">
              <span className="chip">Witness {i + 1}</span>
              <button type="button" className="link-danger" onClick={() => removeWitness(i)}>
                Remove
              </button>
            </div>
            <div className="grid-2">
              <div className="field-block">
                <label className="field-label">Full name <span className="req">*</span></label>
                <input
                  type="text"
                  value={w.fullName}
                  onChange={(e) => updateWitness(i, { fullName: e.target.value })}
                />
              </div>
              <div className="field-block">
                <label className="field-label">NIC number</label>
                <input
                  type="text"
                  value={w.nicNo}
                  onChange={(e) => updateWitness(i, { nicNo: e.target.value })}
                />
              </div>
            </div>
            <label className="field-label">Statement of the witness</label>
            <textarea
              rows={3}
              value={w.account}
              onChange={(e) => updateWitness(i, { account: e.target.value })}
              placeholder="What did the witness see or hear?"
            />
          </div>
        ))}
        <button type="button" className="btn btn-secondary" onClick={addWitness}>
          + Add a witness
        </button>
      </section>

      {/* SAVE */}
      <div className="save-bar">
        <button type="button" className="btn btn-secondary" onClick={() => handleSubmit(false)}>
          Save as draft
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={result.status === 'saving'}
          onClick={() => handleSubmit(true)}
        >
          🔒 {result.status === 'saving' ? 'Sealing…' : 'Save & seal to ledger'}
        </button>
      </div>

      {result.status === 'success' && (
        <div className="result-banner success">
          Sealed as <strong>{result.complaintNumber}</strong>. Off-chain record hash:{' '}
          <code>{result.hash}</code>
        </div>
      )}
      {result.status === 'error' && (
        <div className="result-banner error">{result.message}</div>
      )}
    </div>
  );
}
