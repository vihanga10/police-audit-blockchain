import type { ComplaintPayload } from './types';

const API_BASE = 'http://localhost:3000';

export async function submitComplaint(payload: ComplaintPayload) {
  const res = await fetch(`${API_BASE}/complaints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed with status ${res.status}`);
  }
  return res.json() as Promise<{
    complaintNumber: string;
    offChainRecordHash: string;
    vulnerableVictim: boolean;
  }>;
}

/** SHA-256 of a recorded audio blob, computed client-side, ready for captureStatement. */
export async function hashAudioBlob(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Nominatim geocoding — a suggestion only; the officer's pin placement is authoritative. */
export async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=lk&q=${encodeURIComponent(address)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'gcib-research-prototype' } });
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch {
    // network/geocoder failure — the map falls back to the station default
  }
  return null;
}