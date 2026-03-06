'use client';

import { useEffect, useRef } from 'react';

export interface MapMarker {
  lat: number;
  lon: number;
  label: string;       // person display name or event type
  surname: string;     // for color coding (empty string for events)
  eventType: 'birth' | 'death' | 'event';
  eventLabel?: string; // e.g. "Military service"
  dateRaw?: string;
  place?: string;
  personId: string;
}

interface PersonMapProps {
  markers: MapMarker[];
  centerId?: string;
}

// Generate a consistent HSL hue from a surname string
function surnameHue(surname: string): number {
  let hash = 0;
  for (let i = 0; i < surname.length; i++) {
    hash = (hash * 31 + surname.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash) % 360;
}

function markerColor(surname: string): string {
  const hue = surnameHue(surname);
  return `hsl(${hue}, 70%, 45%)`;
}

function makeSvg(eventType: 'birth' | 'death' | 'event', color: string): string {
  if (eventType === 'birth') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
      <circle cx="9" cy="9" r="8" fill="${color}" stroke="white" stroke-width="2"/>
    </svg>`;
  }
  if (eventType === 'death') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
      <circle cx="9" cy="9" r="7" fill="white" stroke="${color}" stroke-width="2.5"/>
      <line x1="5.5" y1="5.5" x2="12.5" y2="12.5" stroke="${color}" stroke-width="2"/>
      <line x1="12.5" y1="5.5" x2="5.5" y2="12.5" stroke="${color}" stroke-width="2"/>
    </svg>`;
  }
  // event: diamond shape
  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
    <polygon points="9,1 17,9 9,17 1,9" fill="${color}" stroke="white" stroke-width="1.5"/>
  </svg>`;
}

function makePopup(m: MapMarker, color: string): string {
  const typeLabel = m.eventType === 'birth' ? '● Naissance'
    : m.eventType === 'death' ? '✕ Décès'
    : `◆ ${m.eventLabel || 'Événement'}`;
  return `<div style="font-family:system-ui,sans-serif;font-size:13px;min-width:160px">
    <strong style="color:${color}">${m.label}</strong><br/>
    <span style="color:#64748b">${typeLabel}</span><br/>
    ${m.dateRaw ? `<span>${m.dateRaw}</span><br/>` : ''}
    ${m.place ? `<span style="color:#94a3b8">${m.place}</span>` : ''}
  </div>`;
}

export default function PersonMap({ markers, centerId }: PersonMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || markers.length === 0) return;
    let cancelled = false;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    import('leaflet').then((L) => {
      if (cancelled || !mapRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: true });
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      const bounds: [number, number][] = [];

      for (const m of markers) {
        const color = m.eventType === 'event' ? '#6366f1' : markerColor(m.surname || '?');
        const icon = L.divIcon({
          html: makeSvg(m.eventType, color),
          className: '',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
          popupAnchor: [0, -12],
        });

        L.marker([m.lat, m.lon], { icon })
          .bindPopup(makePopup(m, color))
          .addTo(map);

        bounds.push([m.lat, m.lon]);
      }

      if (bounds.length > 0) {
        map.fitBounds(bounds as any, { padding: [40, 40], maxZoom: 10 });
      }
    });

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [markers, centerId]);

  // Families in the map (exclude pure-event markers)
  const surnames = [...new Set(
    markers.filter(m => m.eventType !== 'event').map(m => m.surname).filter(Boolean)
  )].sort();

  const hasEvents = markers.some(m => m.eventType === 'event');

  return (
    <div>
      <div ref={mapRef} style={{ height: '420px', width: '100%', borderRadius: '8px', zIndex: 0 }} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-xs text-slate-500 dark:text-slate-400">
        {/* Family colors */}
        {surnames.map(s => (
          <span key={s} className="flex items-center gap-1.5">
            <span style={{ background: markerColor(s), width: 11, height: 11, borderRadius: '50%', display: 'inline-block', flexShrink: 0 }} />
            {s}
          </span>
        ))}
        {/* Divider */}
        {surnames.length > 0 && <span className="text-slate-300 dark:text-slate-600">|</span>}
        {/* Shape legend */}
        <span className="flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" fill="#94a3b8"/></svg>
          naissance
        </span>
        <span className="flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <circle cx="6" cy="6" r="4.5" fill="none" stroke="#94a3b8" strokeWidth="2"/>
            <line x1="3.5" y1="3.5" x2="8.5" y2="8.5" stroke="#94a3b8" strokeWidth="1.5"/>
            <line x1="8.5" y1="3.5" x2="3.5" y2="8.5" stroke="#94a3b8" strokeWidth="1.5"/>
          </svg>
          décès
        </span>
        {hasEvents && (
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 12 12">
              <polygon points="6,1 11,6 6,11 1,6" fill="#6366f1"/>
            </svg>
            événement
          </span>
        )}
      </div>
    </div>
  );
}
