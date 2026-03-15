'use client';

import { useState, useEffect, useRef } from 'react';

export interface JourneyStop {
  type: 'birth' | 'event' | 'death' | 'burial';
  label: string;
  dateRaw?: string;
  place?: string;
  lat?: number | null;
  lon?: number | null;
}

interface MigrationSectionProps {
  stops: JourneyStop[];   // for timeline display (passed via RSC, coords may be dropped)
  personId: string;       // kept for potential future use
  stopsJson: string;      // JSON string — strings survive RSC serialization intact
}

const STOP_COLOR: Record<string, string> = {
  birth:  '#166534',
  death:  '#dc2626',
  burial: '#78716c',
  event:  '#6366f1',
};

const STOP_ICON: Record<string, string> = {
  birth:  '●',
  death:  '✕',
  burial: '⚰',
  event:  '◆',
};

const MAP_COLORS: Record<string, string> = {
  birth:   '#166534',
  death:   '#dc2626',
  burial:  '#78716c',
  event:   '#6366f1',
};

function makeStopIcon(type: string): string {
  const color = MAP_COLORS[type] ?? '#6366f1';
  if (type === 'birth') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="12" fill="${color}" stroke="white" stroke-width="2.5"/><circle cx="14" cy="14" r="5" fill="white"/></svg>`;
  }
  if (type === 'death') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="12" fill="white" stroke="${color}" stroke-width="3"/><line x1="8" y1="8" x2="20" y2="20" stroke="${color}" stroke-width="2.5"/><line x1="20" y1="8" x2="8" y2="20" stroke="${color}" stroke-width="2.5"/></svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><polygon points="12,2 22,12 12,22 2,12" fill="${color}" stroke="white" stroke-width="2"/></svg>`;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

interface GeoStop {
  type: string; label: string; dateRaw?: string;
  place?: string; lat: number | null; lon: number | null;
}

function MapContainer({ stopsJson }: { stopsJson: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [debugInfo, setDebugInfo] = useState('chargement…');

  useEffect(() => {
    if (!containerRef.current) return;
    let leafletMap: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any

    import('leaflet').then((L: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (!containerRef.current) return;
      const allStops: GeoStop[] = JSON.parse(stopsJson);

      const geoStops = allStops.filter((s: GeoStop) => typeof s.lat === 'number' && typeof s.lon === 'number');
      setDebugInfo(`${geoStops.length}/${allStops.length} géolocalisés`);

      if (geoStops.length === 0) return;

      leafletMap = L.map(containerRef.current, { zoomControl: true, scrollWheelZoom: true });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(leafletMap);

      const latlngs: [number, number][] = [];
      for (let i = 0; i < geoStops.length; i++) {
        const stop = geoStops[i];
        const ll: [number, number] = [stop.lat as number, stop.lon as number];
        latlngs.push(ll);

        const popup = `<div style="font-family:system-ui,sans-serif;font-size:13px;line-height:1.6;min-width:160px">
          <strong style="color:${MAP_COLORS[stop.type] ?? '#374151'}">${esc(stop.label)}</strong>
          ${stop.dateRaw ? `<br/><span>${esc(stop.dateRaw)}</span>` : ''}
          ${stop.place ? `<br/><span style="color:#64748b">${esc(stop.place)}</span>` : ''}
          <br/><span style="color:#94a3b8;font-size:11px">Étape ${i + 1} / ${geoStops.length}</span>
        </div>`;

        L.marker(ll, {
          icon: L.divIcon({ html: makeStopIcon(stop.type), className: '', iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -16] }),
          zIndexOffset: 100,
        }).bindPopup(popup, { maxWidth: 240 }).addTo(leafletMap);
      }

      if (latlngs.length >= 2) {
        L.polyline(latlngs, { color: '#166534', weight: 3, opacity: 0.7, dashArray: '9 6' }).addTo(leafletMap);
        for (let i = 0; i < latlngs.length - 1; i++) {
          const [lat1, lon1] = latlngs[i];
          const [lat2, lon2] = latlngs[i + 1];
          const angle = Math.atan2(lat2 - lat1, lon2 - lon1) * (180 / Math.PI);
          L.marker([(lat1 + lat2) / 2, (lon1 + lon2) / 2], {
            icon: L.divIcon({ html: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" style="transform:rotate(${angle - 90}deg)"><polygon points="9,1 16,16 9,11 2,16" fill="#166534" opacity="0.85"/></svg>`, className: '', iconSize: [18, 18], iconAnchor: [9, 9] }),
            interactive: false,
          }).addTo(leafletMap);
        }
        leafletMap.fitBounds(latlngs as Parameters<typeof leafletMap.fitBounds>[0], { padding: [50, 50], maxZoom: 10 });
      } else if (latlngs.length === 1) {
        leafletMap.setView(latlngs[0], 8);
      }
    }).catch(err => setDebugInfo(`erreur: ${err}`));

    return () => {
      if (leafletMap) { leafletMap.remove(); leafletMap = null; }
    };
  }, [stopsJson]);

  return (
    <div style={{ position: 'relative' }}>
      <div ref={containerRef} style={{ height: '320px', width: '100%', borderRadius: '8px', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: 4, left: 8, zIndex: 1000, background: 'rgba(255,255,255,0.85)', fontSize: 11, padding: '2px 6px', borderRadius: 4, pointerEvents: 'none' }}>
        {debugInfo}
      </div>
    </div>
  );
}

export default function MigrationSection({ stops, personId: _personId, stopsJson }: MigrationSectionProps) {
  const [showMap, setShowMap] = useState(true);

  const stopsWithPlace = stops.filter(s => s.place);
  // Count stops with coords for the toggle button — if 0, we hide the button
  // (actual check happens via API fetch in MapContainer)
  const hasAnyCoords = stops.some(s => s.lat != null && s.lon != null);

  if (stopsWithPlace.length < 2) return null;

  return (
    <div className="dark:bg-slate-900 rounded-xl p-6 shadow-sm mt-6" style={{ background: '#fffaf5', border: '1px solid #e8dcc8' }}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold" style={{ color: '#3d2e1e' }}>Parcours de migration</h2>
        <button
          onClick={() => setShowMap(v => !v)}
          className="text-sm px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
          style={{
            background: showMap ? '#166534' : 'transparent',
            color: showMap ? 'white' : '#166534',
            border: '1px solid #166534',
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6-10l6-3m0 16l5.447-2.724A1 1 0 0021 17.382V6.618a1 1 0 00-1.447-.894L15 8m0 9V5" />
          </svg>
          {showMap ? 'Masquer la carte' : 'Voir sur la carte'}
        </button>
      </div>

      {/* Horizontal step timeline */}
      <div className="overflow-x-auto pb-2">
        <div className="flex items-start min-w-max gap-0">
          {stopsWithPlace.map((stop, i) => (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center text-center w-36 px-1">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-base font-bold mb-2 shrink-0"
                  style={{
                    background: stop.type === 'death' ? 'white' : (STOP_COLOR[stop.type] ?? '#6366f1'),
                    border: stop.type === 'death' ? `2.5px solid ${STOP_COLOR.death}` : 'none',
                    color: stop.type === 'death' ? STOP_COLOR.death : 'white',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                  }}
                >
                  {STOP_ICON[stop.type] ?? '◆'}
                </div>
                <p className="text-xs font-semibold" style={{ color: STOP_COLOR[stop.type] ?? '#6366f1' }}>{stop.label}</p>
                {stop.dateRaw && <p className="text-xs mt-0.5" style={{ color: '#8a7560' }}>{stop.dateRaw}</p>}
                <p className="text-xs mt-0.5 leading-tight" style={{ color: '#5a4a38' }}>{stop.place}</p>
              </div>

              {i < stopsWithPlace.length - 1 && (
                <div className="flex items-center shrink-0 mx-1" style={{ color: '#c4b49a' }}>
                  <div style={{ width: 24, height: 1, background: '#c4b49a' }} />
                  <svg width="8" height="10" viewBox="0 0 8 10" fill="none">
                    <path d="M0 0L8 5L0 10" fill="#c4b49a"/>
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {showMap && (
        <div className="mt-4">
          <MapContainer stopsJson={stopsJson} />
        </div>
      )}
    </div>
  );
}
