'use client';

import { useEffect, useRef } from 'react';
import type { JourneyStop } from './MigrationSection';

interface MigrationMapProps {
  stops: JourneyStop[];
}

const STOP_COLORS: Record<string, string> = {
  birth:   '#166534',
  death:   '#dc2626',
  burial:  '#78716c',
  event:   '#6366f1',
};

function makeStopIcon(type: string): string {
  const color = STOP_COLORS[type] ?? '#6366f1';
  if (type === 'birth') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="12" fill="${color}" stroke="white" stroke-width="2.5"/><circle cx="14" cy="14" r="5" fill="white"/></svg>`;
  }
  if (type === 'death') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="12" fill="white" stroke="${color}" stroke-width="3"/><line x1="8" y1="8" x2="20" y2="20" stroke="${color}" stroke-width="2.5"/><line x1="20" y1="8" x2="8" y2="20" stroke="${color}" stroke-width="2.5"/></svg>`;
  }
  if (type === 'burial') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3" fill="${color}" stroke="white" stroke-width="2"/><line x1="12" y1="7" x2="12" y2="17" stroke="white" stroke-width="2"/><line x1="7" y1="11" x2="17" y2="11" stroke="white" stroke-width="2"/></svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><polygon points="12,2 22,12 12,22 2,12" fill="${color}" stroke="white" stroke-width="2"/></svg>`;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default function MigrationMap({ stops }: MigrationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    let cancelled = false;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    import('leaflet').then(L => {
      if (cancelled || !mapRef.current) return;

      const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: true });
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      const latlngs: [number, number][] = [];

      for (let i = 0; i < stops.length; i++) {
        const stop = stops[i];
        // stops already filtered to have coords by MigrationSection
        if (stop.lat == null || stop.lon == null) continue;
        const ll: [number, number] = [Number(stop.lat), Number(stop.lon)];
        latlngs.push(ll);

        const popup = `<div style="font-family:system-ui,sans-serif;font-size:13px;line-height:1.6;min-width:160px">
          <strong style="color:${STOP_COLORS[stop.type] ?? '#374151'}">${esc(stop.label)}</strong>
          ${stop.dateRaw ? `<br/><span>${esc(stop.dateRaw)}</span>` : ''}
          ${stop.place ? `<br/><span style="color:#64748b">${esc(stop.place)}</span>` : ''}
          <br/><span style="color:#94a3b8;font-size:11px">Étape ${i + 1} / ${stops.length}</span>
        </div>`;

        L.marker(ll, {
          icon: L.divIcon({
            html: makeStopIcon(stop.type),
            className: '',
            iconSize: [28, 28],
            iconAnchor: [14, 14],
            popupAnchor: [0, -16],
          }),
          zIndexOffset: 100,
        }).bindPopup(popup, { maxWidth: 240 }).addTo(map);
      }

      if (latlngs.length >= 2) {
        // Path line
        L.polyline(latlngs, {
          color: '#166534',
          weight: 3,
          opacity: 0.7,
          dashArray: '9 6',
        }).addTo(map);

        // Direction arrows at mid-segments
        for (let i = 0; i < latlngs.length - 1; i++) {
          const [lat1, lon1] = latlngs[i];
          const [lat2, lon2] = latlngs[i + 1];
          const midLat = (lat1 + lat2) / 2;
          const midLon = (lon1 + lon2) / 2;
          const angle = Math.atan2(lat2 - lat1, lon2 - lon1) * (180 / Math.PI);
          const arrowSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" style="transform:rotate(${angle - 90}deg)"><polygon points="9,1 16,16 9,11 2,16" fill="#166534" opacity="0.85"/></svg>`;
          L.marker([midLat, midLon], {
            icon: L.divIcon({ html: arrowSvg, className: '', iconSize: [18, 18], iconAnchor: [9, 9] }),
            interactive: false,
          }).addTo(map);
        }

        map.fitBounds(latlngs as Parameters<typeof map.fitBounds>[0], { padding: [50, 50], maxZoom: 10 });
      } else if (latlngs.length === 1) {
        map.setView(latlngs[0], 8);
      }
    });

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [stops]);

  return (
    <div ref={mapRef} style={{ height: '320px', width: '100%', borderRadius: '8px', zIndex: 0 }} />
  );
}
