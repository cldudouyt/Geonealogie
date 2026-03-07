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
  year?: number;
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

function extractYear(dateRaw?: string): number | undefined {
  if (!dateRaw) return undefined;
  const m = dateRaw.match(/\b(\d{4})\b/);
  return m ? parseInt(m[1]) : undefined;
}

export default function GlobalMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const migrationLayerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerLayerRef = useRef<any>(null);
  const markersDataRef = useRef<GlobalMarker[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [showMigrations, setShowMigrations] = useState(false);
  const [yearRange, setYearRange] = useState<[number, number] | null>(null);
  const [activeRange, setActiveRange] = useState<[number, number] | null>(null);

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
      const raw: GlobalMarker[] = data.markers ?? [];
      const markers: GlobalMarker[] = raw.map(m => ({ ...m, year: extractYear(m.dateRaw) }));
      markersDataRef.current = markers;
      setTotal(markers.length);

      // Compute year range
      const years = markers.map(m => m.year).filter((y): y is number => y != null);
      if (years.length > 0) {
        const mn = Math.min(...years);
        const mx = Math.max(...years);
        setYearRange([mn, mx]);
        setActiveRange([mn, mx]);
      }

      const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: true });
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      const layer = L.layerGroup().addTo(map);
      markerLayerRef.current = layer;

      const bounds: [number, number][] = [];
      for (const m of markers) {
        const color = markerColor(m.surname, m.eventType);
        const svg = m.eventType === 'birth'
          ? `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="9" fill="${color}" stroke="white" stroke-width="2"/></svg>`
          : `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="8.5" fill="white" stroke="${color}" stroke-width="2.5"/><line x1="6" y1="6" x2="16" y2="16" stroke="${color}" stroke-width="2"/><line x1="16" y1="6" x2="6" y2="16" stroke="${color}" stroke-width="2"/></svg>`;
        const icon = L.divIcon({ html: svg, className: '', iconSize: [22, 22], iconAnchor: [11, 11], popupAnchor: [0, -13] });
        const popup = `<div style="font-size:14px;min-width:180px;line-height:1.5"><strong style="color:${color}">${m.label}</strong><br/><span style="color:#64748b">${m.eventType === 'birth' ? '● Naissance' : '✕ Décès'}</span>${m.dateRaw ? `<br/>${m.dateRaw}` : ''}${m.place ? `<br/><span style="color:#94a3b8">${m.place}</span>` : ''}<br/><a href="/person/${m.personId}" style="color:#3b82f6;text-decoration:underline;display:inline-block;margin-top:4px">Voir la fiche →</a></div>`;
        L.marker([m.lat, m.lon], { icon }).bindPopup(popup, { maxWidth: 260 }).addTo(layer);
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

  // Re-render markers when year range filter changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markerLayerRef.current;
    if (!map || !layer || !activeRange) return;

    import('leaflet').then(L => {
      layer.clearLayers();
      const [from, to] = activeRange;
      const markers = markersDataRef.current;
      for (const m of markers) {
        // Show marker if it has no year (unknown) or is within range
        if (m.year != null && (m.year < from || m.year > to)) continue;
        const color = markerColor(m.surname, m.eventType);
        const svg = m.eventType === 'birth'
          ? `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="9" fill="${color}" stroke="white" stroke-width="2"/></svg>`
          : `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="8.5" fill="white" stroke="${color}" stroke-width="2.5"/><line x1="6" y1="6" x2="16" y2="16" stroke="${color}" stroke-width="2"/><line x1="16" y1="6" x2="6" y2="16" stroke="${color}" stroke-width="2"/></svg>`;
        const icon = L.divIcon({ html: svg, className: '', iconSize: [22, 22], iconAnchor: [11, 11], popupAnchor: [0, -13] });
        const popup = `<div style="font-size:14px;min-width:180px;line-height:1.5"><strong style="color:${color}">${m.label}</strong><br/><span style="color:#64748b">${m.eventType === 'birth' ? '● Naissance' : '✕ Décès'}</span>${m.dateRaw ? `<br/>${m.dateRaw}` : ''}${m.place ? `<br/><span style="color:#94a3b8">${m.place}</span>` : ''}<br/><a href="/person/${m.personId}" style="color:#3b82f6;text-decoration:underline;display:inline-block;margin-top:4px">Voir la fiche →</a></div>`;
        L.marker([m.lat, m.lon], { icon }).bindPopup(popup, { maxWidth: 260 }).addTo(layer);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRange]);

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
        if (dist < 0.05) continue;

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

  const isFiltered = yearRange && activeRange && (activeRange[0] !== yearRange[0] || activeRange[1] !== yearRange[1]);

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <div ref={mapRef} style={{ height: '100%', width: '100%', zIndex: 0 }} />

      {/* Top-right controls */}
      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
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

      {/* Year filter */}
      {yearRange && activeRange && (
        <div style={{
          position: 'absolute', bottom: 48, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, background: 'rgba(15,23,42,0.88)', backdropFilter: 'blur(6px)',
          borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12,
          color: 'white', fontFamily: 'sans-serif', fontSize: 12,
        }}>
          <span style={{ color: '#94a3b8', whiteSpace: 'nowrap' }}>Période :</span>
          <input
            type="number" min={yearRange[0]} max={activeRange[1]}
            value={activeRange[0]}
            onChange={e => setActiveRange([parseInt(e.target.value) || yearRange[0], activeRange[1]])}
            style={{ width: 64, padding: '2px 6px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: 12, textAlign: 'center' }}
          />
          <span style={{ color: '#64748b' }}>–</span>
          <input
            type="number" min={activeRange[0]} max={yearRange[1]}
            value={activeRange[1]}
            onChange={e => setActiveRange([activeRange[0], parseInt(e.target.value) || yearRange[1]])}
            style={{ width: 64, padding: '2px 6px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: 12, textAlign: 'center' }}
          />
          {isFiltered && (
            <button
              onClick={() => setActiveRange(yearRange)}
              style={{ padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.12)', color: '#94a3b8', fontSize: 11, cursor: 'pointer' }}
            >
              Reset
            </button>
          )}
        </div>
      )}

      {/* Bottom-left info */}
      {total !== null && (
        <div style={{ position: 'absolute', bottom: 24, left: 10, zIndex: 1000 }}>
          <span style={{ background: 'rgba(15,23,42,0.75)', color: '#94a3b8', fontSize: 11, padding: '3px 8px', borderRadius: 4 }}>
            {total} lieux géolocalisés{isFiltered ? ` · filtre ${activeRange![0]}–${activeRange![1]}` : ''}
          </span>
        </div>
      )}
    </div>
  );
}
