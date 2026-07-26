import { useRef, useState } from 'react';
import { hashAudioBlob } from '../api';

export interface StatementValue {
  statementId: string;
  text: string;
  audioHash?: string;
  audioCid?: string;
  noAudioReason?: string;
  readBackConfirmed: boolean;
  captureTimestamp: string;
}

interface Props {
  label: string;
  value: StatementValue;
  onChange: (v: StatementValue) => void;
}

/**
 * PROTOTYPE SIMPLIFICATION, stated plainly: this records real audio and
 * computes a real SHA-256 hash of it client-side (the same hash the
 * chaincode anchors via captureStatement), but does not yet run Whisper —
 * the officer types the statement manually instead of a live transcript
 * appearing as they speak. Wiring Whisper in is the natural next step;
 * the capture-time anchoring mechanism itself (audio -> hash -> anchor,
 * before the complaint is sealed) is real and unaffected by that gap.
 */
export default function StatementRecorder({ label, value, onChange }: Props) {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunks.current = [];
    recorder.ondataavailable = (e) => chunks.current.push(e.data);
    recorder.onstop = async () => {
      const blob = new Blob(chunks.current, { type: 'audio/webm' });
      const hash = await hashAudioBlob(blob);
      setAudioUrl(URL.createObjectURL(blob));
      onChange({
        ...value,
        audioHash: hash,
        noAudioReason: '',
        captureTimestamp: new Date().toISOString(),
      });
      stream.getTracks().forEach((t) => t.stop());
    };
    recorder.start();
    mediaRecorder.current = recorder;
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setRecording(false);
  };

  return (
    <div className="field-block statement-block">
      <label className="field-label">{label}</label>

      <div className="recorder-row">
        {!recording ? (
          <button type="button" className="btn btn-record" onClick={startRecording}>
            ● Start recording
          </button>
        ) : (
          <button type="button" className="btn btn-recording" onClick={stopRecording}>
            ■ Stop recording
          </button>
        )}
        {audioUrl && <audio controls src={audioUrl} className="audio-preview" />}
      </div>

      {value.audioHash ? (
        <div className="anchor-note">
          🔒 Audio hash <code>{value.audioHash.slice(0, 16)}…</code> will be anchored to the
          ledger the moment this statement is captured — before the complaint is sealed.
        </div>
      ) : (
        <div className="no-audio-row">
          <label className="field-label small">No recording made — reason</label>
          <input
            type="text"
            placeholder="e.g. complainant declined to be recorded"
            value={value.noAudioReason ?? ''}
            onChange={(e) =>
              onChange({ ...value, noAudioReason: e.target.value, audioHash: '' })
            }
          />
        </div>
      )}

      <label className="field-label small">Statement text (Sinhala)</label>
      <textarea
        rows={5}
        value={value.text}
        onChange={(e) => onChange({ ...value, text: e.target.value })}
        placeholder="Type or correct the statement here"
      />

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={value.readBackConfirmed}
          onChange={(e) => onChange({ ...value, readBackConfirmed: e.target.checked })}
        />
        I confirm this statement has been read back to / reviewed with the person and
        accurately reflects what they said.
      </label>
    </div>
  );
}
