'use client';

import { useEffect, useRef } from 'react';

export interface BirthplaceEntry {
  place: string;
  region: string;
  lat: number;
  lng: number;
  count: number;
  color: string;
}

export interface FocusedPerson {
  name: string;
  lat: number;
  lng: number;
  birthPlace?: string;
}

interface Props {
  places: BirthplaceEntry[];
  flyToRef: React.MutableRefObject<((lat: number, lng: number) => void) | null>;
  focusedPerson?: FocusedPerson | null;
}

function buildPinHtml(place: string, count: number, color: string): string {
  return `
    <div style="display:flex;flex-direction:column;align-items:center;pointer-events:none">
      <div style="background:#fffdf9;border:1px solid #d8cfb8;border-radius:9px;padding:5px 9px;
                  box-shadow:0 4px 14px -7px rgba(0,0,0,.5);white-space:nowrap;margin-bottom:5px">
        <span style="font-size:11.5px;font-weight:700;color:#1c1f1c">${place}</span>
        <span style="font-size:11px;color:#2f5142;font-weight:700;margin-left:4px">${count}</span>
      </div>
      <div style="width:14px;height:14px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
                  background:${color};border:2px solid #fffdf9;box-shadow:0 2px 5px rgba(0,0,0,.35)"></div>
    </div>
  `;
}

function buildPersonPinHtml(name: string, birthPlace?: string): string {
  return `
    <div style="display:flex;flex-direction:column;align-items:center;pointer-events:none">
      <div style="background:#1e3a2f;border:1.5px solid #c9a86a;border-radius:9px;padding:5px 10px;
                  box-shadow:0 4px 14px -5px rgba(0,0,0,.6);white-space:nowrap;margin-bottom:5px;max-width:200px">
        <span style="font-size:12px;font-weight:700;color:#f4efe3;display:block;overflow:hidden;text-overflow:ellipsis">${name}</span>
        ${birthPlace ? `<span style="font-size:10.5px;color:#9fb0a1">${birthPlace}</span>` : ''}
      </div>
      <div style="width:14px;height:14px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
                  background:#c9a86a;border:2px solid #1e3a2f;box-shadow:0 2px 6px rgba(0,0,0,.45)"></div>
    </div>
  `;
}

export default function OriginsMap({ places, flyToRef, focusedPerson }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const focusedMarkerRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || places.length === 0) return;
    let cancelled = false;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    import('leaflet').then(L => {
      if (cancelled || !mapRef.current) return;
      leafletRef.current = L;

      const map = L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      });

      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
        className: 'geo-tile',
      }).addTo(map);

      const bounds: [number, number][] = [];

      for (const entry of places) {
        const html = buildPinHtml(entry.place, entry.count, entry.color);
        const icon = L.divIcon({
          html,
          className: '',
          iconSize: [120, 60],
          iconAnchor: [60, 60],
          popupAnchor: [0, -62],
        });

        L.marker([entry.lat, entry.lng], { icon })
          .bindPopup(
            `<div style="font-size:13px;min-width:160px">
              <strong style="color:#1c1f1c">${entry.place}</strong><br/>
              ${entry.region ? `<span style="color:#8a8474">${entry.region}</span><br/>` : ''}
              <span style="color:#2f5142;font-weight:700">${entry.count} personne${entry.count > 1 ? 's' : ''}</span>
            </div>`,
            { maxWidth: 220 }
          )
          .addTo(map);

        bounds.push([entry.lat, entry.lng]);
      }

      if (bounds.length > 0) {
        map.fitBounds(bounds as Parameters<typeof map.fitBounds>[0], {
          padding: [40, 40],
          maxZoom: 8,
        });
      }

      flyToRef.current = (lat: number, lng: number) => {
        map.flyTo([lat, lng], 9, { duration: 1.2 });
      };
    });

    return () => {
      cancelled = true;
      flyToRef.current = null;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapInstanceRef.current;

    if (focusedMarkerRef.current) {
      focusedMarkerRef.current.remove();
      focusedMarkerRef.current = null;
    }

    if (!L || !map || !focusedPerson) return;

    const icon = L.divIcon({
      html: buildPersonPinHtml(focusedPerson.name, focusedPerson.birthPlace),
      className: '',
      iconSize: [200, 70],
      iconAnchor: [100, 70],
      popupAnchor: [0, -72],
    });

    focusedMarkerRef.current = L.marker([focusedPerson.lat, focusedPerson.lng], { icon })
      .addTo(map);
  }, [focusedPerson]);

  return (
    <>
      <style>{`
        .geo-tile {
          filter: sepia(20%) saturate(80%) hue-rotate(60deg) brightness(102%);
        }
      `}</style>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
    </>
  );
}
