'use client';

import { useEffect, useRef } from 'react';

export interface MapMarker {
  lat: number;
  lon: number;
  label: string;       // person display name
  surname: string;     // for color coding
  eventType: 'birth' | 'death';
  dateRaw?: string;
  place?: string;
  personId: string;
}

interface PersonMapProps {
  markers: MapMarker[];
  centerId?: string;   // personId to center on
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

export default function PersonMap({ markers, centerId }: PersonMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || markers.length === 0) return;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Dynamic import to avoid SSR issues
    import('leaflet').then((L) => {
      if (!mapRef.current) return;

      // Fix default icon paths for Next.js
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
        const color = markerColor(m.surname || '?');
        const isBirth = m.eventType === 'birth';

        // SVG circle marker: filled for birth, ring for death
        const svg = isBirth
          ? `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
               <circle cx="9" cy="9" r="8" fill="${color}" stroke="white" stroke-width="2"/>
             </svg>`
          : `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
               <circle cx="9" cy="9" r="7" fill="white" stroke="${color}" stroke-width="2.5"/>
               <line x1="6" y1="6" x2="12" y2="12" stroke="${color}" stroke-width="2"/>
               <line x1="12" y1="6" x2="6" y2="12" stroke="${color}" stroke-width="2"/>
             </svg>`;

        const icon = L.divIcon({
          html: svg,
          className: '',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
          popupAnchor: [0, -12],
        });

        const popup = `
          <div style="font-family:system-ui,sans-serif;font-size:13px;min-width:160px">
            <strong style="color:${color}">${m.label}</strong><br/>
            <span style="color:#64748b">${isBirth ? '● Naissance' : '✕ Décès'}</span><br/>
            ${m.dateRaw ? `<span>${m.dateRaw}</span><br/>` : ''}
            ${m.place ? `<span style="color:#64748b">${m.place}</span>` : ''}
          </div>`;

        L.marker([m.lat, m.lon], { icon })
          .bindPopup(popup)
          .addTo(map);

        bounds.push([m.lat, m.lon]);
      }

      if (bounds.length > 0) {
        map.fitBounds(bounds as any, { padding: [40, 40], maxZoom: 10 });
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [markers, centerId]);

  // Build surname legend
  const surnames = [...new Set(markers.map(m => m.surname).filter(Boolean))].sort();

  return (
    <div>
      <div ref={mapRef} style={{ height: '380px', width: '100%', borderRadius: '8px', zIndex: 0 }} />
      {surnames.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-3">
          {surnames.map(s => (
            <span key={s} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
              <span
                style={{ background: markerColor(s), width: 12, height: 12, borderRadius: '50%', display: 'inline-block' }}
              />
              {s}
            </span>
          ))}
          <span className="flex items-center gap-1.5 text-xs text-slate-500 ml-2">
            <svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="6" fill="currentColor" opacity="0.4"/></svg> naissance
          </span>
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <svg width="14" height="14" viewBox="0 0 14 14">
              <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
              <line x1="4.5" y1="4.5" x2="9.5" y2="9.5" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/>
              <line x1="9.5" y1="4.5" x2="4.5" y2="9.5" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/>
            </svg> décès
          </span>
        </div>
      )}
    </div>
  );
}
