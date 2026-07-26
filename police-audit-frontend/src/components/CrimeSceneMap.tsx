import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { geocode } from '../api';

// Leaflet's default marker icons reference image files that Vite doesn't
// resolve automatically — wire them up explicitly once.
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

// Fallback centre when geocoding fails or hasn't run yet — Maharagama
// station, used purely as a default; a real deployment would fall back
// to the officer's own station coordinates.
const DEFAULT_CENTER: [number, number] = [6.8490, 79.9718];

interface Props {
  address: string;
  onLocationChange: (lat: number, lng: number, confirmedByOfficer: boolean) => void;
}

export default function CrimeSceneMap({ address, onLocationChange }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [coords, setCoords] = useState<[number, number]>(DEFAULT_CENTER);
  const [confirmed, setConfirmed] = useState(false);
  const [locationUnknown, setLocationUnknown] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const map = L.map(mapRef.current).setView(DEFAULT_CENTER, 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    const marker = L.marker(DEFAULT_CENTER, { draggable: true }).addTo(map);
    marker.on('dragend', () => {
      const { lat, lng } = marker.getLatLng();
      setCoords([lat, lng]);
      setConfirmed(true);
      onLocationChange(lat, lng, true);
    });

    mapInstance.current = map;
    markerRef.current = marker;
    return () => {
      map.remove();
      mapInstance.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!address || address.trim().length < 4) return;
    const timer = setTimeout(async () => {
      const result = await geocode(address);
      if (result && mapInstance.current && markerRef.current) {
        mapInstance.current.setView([result.lat, result.lng], 16);
        markerRef.current.setLatLng([result.lat, result.lng]);
        setCoords([result.lat, result.lng]);
        setConfirmed(false);
        onLocationChange(result.lat, result.lng, false);
      }
    }, 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  return (
    <div className="field-block">
      <label className="field-label">
        Crime scene address <span className="req">*</span>
      </label>
      <p className="field-hint">
        Where and when the crime actually happened — different from the victim's address
        and the time they came to report.
      </p>

      <div className="map-wrap">
        <div ref={mapRef} className="map-canvas" />
      </div>

      <div className="map-readout">
        {locationUnknown ? (
          <span>Location not determined</span>
        ) : (
          <>
            <span>
              {coords[0].toFixed(4)}° N, {coords[1].toFixed(4)}° E
            </span>
            <span className={confirmed ? 'tag tag-confirmed' : 'tag tag-suggested'}>
              {confirmed ? 'confirmed by officer' : 'geocoder suggestion — drag pin to confirm'}
            </span>
          </>
        )}
      </div>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={locationUnknown}
          onChange={(e) => {
            setLocationUnknown(e.target.checked);
            if (e.target.checked) onLocationChange(0, 0, false);
          }}
        />
        Crime scene location could not be determined (record address only)
      </label>
    </div>
  );
}
