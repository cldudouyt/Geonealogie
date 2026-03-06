'use client';

import { useEffect, useRef, useState } from 'react';

interface GlobalMarker {
  lat: number;
  lon: number;
  personId: string;
  label: string;
  surname: string;
  eventType: 'birth' | 'death';
  dateRaw?: string;
  place?: string;
}

function surnameHue(surname: string): number {
  let hash = 0;
  for (let i = 0; i < surname.length; i++) {
    hash = (hash * 31 + surname.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash) % 360;
}

function markerColor(surname: string, eventType: 'birth' | 'death'): string {
  const hue = surnameHue(surname || '?');
  return eventType === 'birth'
    ? `hsl(${hue}, 65%, 45%)`
    : `hsl(${hue}, 50%, 60%)`;
}

export default function GlobalMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    let cancelled = false;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    Promise.all([
      import('leaflet'),
      fetch('/api/persons?allMarkers=true').then(r => r.json()),
    ]).then(([L, data]) => {
      if (cancelled || !mapRef.current) return;
      const markers: GlobalMarker[] = data.markers ?? [];
      setTotal(markers.length);

      const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: true });
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      const bounds: [number, number][] = [];

      for (const m of markers) {
        const color = markerColor(m.surname, m.eventType);
        const svg = m.eventType === 'birth'
          ? `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="6" fill="${color}" stroke="white" stroke-width="1.5"/></svg>`
          : `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5.5" fill="white" stroke="${color}" stroke-width="2"/><line x1="4" y1="4" x2="10" y2="10" stroke="${color}" stroke-width="1.5"/><line x1="10" y1="4" x2="4" y2="10" stroke="${color}" stroke-width="1.5"/></svg>`;

        const icon = L.divIcon({ html: svg, className: '', iconSize: [14, 14], iconAnchor: [7, 7], popupAnchor: [0, -9] });
        const popup = `<div style="font-size:12px;min-width:130px"><strong style="color:${color}">${m.label}</strong><br/><span style="color:#64748b">${m.eventType === 'birth' ? '● Naissance' : '✕ Décès'}</span>${m.dateRaw ? `<br/>${m.dateRaw}` : ''}${m.place ? `<br/><span style="color:#94a3b8">${m.place}</span>` : ''}<br/><a href="/person/${m.personId}" style="color:#3b82f6;text-decoration:underline">Voir la fiche</a></div>`;
        L.marker([m.lat, m.lon], { icon }).bindPopup(popup).addTo(map);
        bounds.push([m.lat, m.lon]);
      }

      if (bounds.length > 0) {
        map.fitBounds(bounds as Parameters<typeof map.fitBounds>[0], { padding: [30, 30], maxZoom: 8 });
      }
    });

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div>
      <div ref={mapRef} style={{ height: '400px', width: '100%', borderRadius: '8px', zIndex: 0 }} />
      {total !== null && (
        <p className="text-xs text-slate-400 mt-2 text-right">
          {total} lieux géolocalisés
        </p>
      )}
    </div>
  );
}
