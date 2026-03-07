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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const migrationLayerRef = useRef<any>(null);
  const markersDataRef = useRef<GlobalMarker[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [showMigrations, setShowMigrations] = useState(false);

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
      markersDataRef.current = markers;
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

  // Toggle migration lines
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    import('leaflet').then(L => {
      if (migrationLayerRef.current) {
        migrationLayerRef.current.remove();
        migrationLayerRef.current = null;
      }
      if (!showMigrations) return;

      const markers = markersDataRef.current;
      const births = new Map<string, GlobalMarker>();
      const deaths = new Map<string, GlobalMarker>();
      for (const m of markers) {
        if (m.eventType === 'birth') births.set(m.personId, m);
        if (m.eventType === 'death') deaths.set(m.personId, m);
      }

      const group = L.layerGroup();
      for (const [personId, birth] of births) {
        const death = deaths.get(personId);
        if (!death) continue;
        const dist = Math.sqrt((birth.lat - death.lat) ** 2 + (birth.lon - death.lon) ** 2);
        if (dist < 0.05) continue; // same location

        const color = markerColor(birth.surname, 'birth');
        L.polyline([[birth.lat, birth.lon], [death.lat, death.lon]], {
          color, weight: 1.5, opacity: 0.55, dashArray: '5 5',
        }).bindPopup(`<div style="font-size:12px"><strong>${birth.label}</strong><br/>Naissance → Décès</div>`)
          .addTo(group);
      }
      group.addTo(map);
      migrationLayerRef.current = group;
    });
  }, [showMigrations]);

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <div ref={mapRef} style={{ height: '100%', width: '100%', zIndex: 0 }} />
      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000 }}>
        <button
          onClick={() => setShowMigrations(v => !v)}
          style={{
            padding: '6px 12px', borderRadius: 6, fontSize: 12, fontFamily: 'sans-serif',
            border: '1px solid rgba(255,255,255,0.25)',
            background: showMigrations ? '#3b82f6' : 'rgba(15,23,42,0.82)',
            color: 'white', cursor: 'pointer', backdropFilter: 'blur(4px)',
          }}
        >
          ↔ Migrations {showMigrations ? 'ON' : 'OFF'}
        </button>
      </div>
      {total !== null && (
        <div style={{ position: 'absolute', bottom: 24, left: 10, zIndex: 1000 }}>
          <span style={{ background: 'rgba(15,23,42,0.75)', color: '#94a3b8', fontSize: 11, padding: '3px 8px', borderRadius: 4 }}>
            {total} lieux géolocalisés
          </span>
        </div>
      )}
    </div>
  );
}
