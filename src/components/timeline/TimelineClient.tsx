'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { PersonSummary } from '@/lib/types';

export interface JourneyStop {
  type: 'birth' | 'event' | 'special' | 'death' | 'burial';
  label: string;
  dateRaw?: string;
  place?: string;
  lat: number | null;
  lon: number | null;
}

interface TimelineClientProps {
  initialStops: JourneyStop[];
  initialPersonName: string;
  initialPersonId: string;
}

// ── Design-token colours matching spec ──────────────────────────────────────
const STOP_STYLE: Record<string, { bg: string; border?: string; color: string; icon: string }> = {
  birth:   { bg: '#2f5142',            color: '#fff',     icon: '●' },
  event:   { bg: '#5b7da3',            color: '#fff',     icon: '◆' },
  special: { bg: '#c9a86a',            color: '#fff',     icon: '◆' },
  death:   { bg: '#fff', border: '2px solid #9c5a52', color: '#9c5a52', icon: '✕' },
  burial:  { bg: '#78716c',            color: '#fff',     icon: '⚰' },
};

const TITLE_COLOR: Record<string, string> = {
  birth:   '#2f5142',
  event:   '#5b7da3',
  special: '#c9a86a',
  death:   '#9c5a52',
  burial:  '#78716c',
};

function extractYear(dateRaw?: string): string {
  if (!dateRaw) return '';
  const m = dateRaw.match(/\b(\d{4})\b/);
  return m ? m[1] : dateRaw;
}

function formatPlace(place?: string): string {
  if (!place) return '';
  const parts = place.split(',').map(p => p.trim()).filter(p => p && !/^\d+$/.test(p));
  if (parts.length === 0) return place;
  if (parts.length === 1) return parts[0];
  const city = parts[0];
  const country = parts[parts.length - 1];
  if (city.toLowerCase() === country.toLowerCase()) return city;
  return `${city}, ${country.charAt(0).toUpperCase() + country.slice(1).toLowerCase()}`;
}

// ── Autocomplete hook (same pattern as /relation) ───────────────────────────
function useAutocomplete(onSelect: (id: string, name: string) => void) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PersonSummary[]>([]);
  const [open, setOpen] = useState(false);

  const search = useCallback(async (q: string) => {
    setQuery(q);
    if (q.length < 2) { setSuggestions([]); setOpen(false); return; }
    const res = await fetch(`/api/persons?autocomplete=true&q=${encodeURIComponent(q)}&limit=8`);
    const data = await res.json();
    setSuggestions(data.persons || []);
    setOpen(true);
  }, []);

  const pick = (p: PersonSummary) => {
    setQuery(p.displayName);
    setSuggestions([]);
    setOpen(false);
    onSelect(p.id, p.displayName);
  };

  return { query, setQuery, search, suggestions, open, setOpen, pick };
}

// ── Leaflet map (lazy import, no SSR) ──────────────────────────────────────
function makeIcon(type: string): string {
  const s = STOP_STYLE[type] ?? STOP_STYLE.event;
  if (type === 'birth') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="${s.bg}" stroke="white" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="white"/></svg>`;
  }
  if (type === 'death') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="white" stroke="#9c5a52" stroke-width="2.5"/><line x1="7" y1="7" x2="17" y2="17" stroke="#9c5a52" stroke-width="2"/><line x1="17" y1="7" x2="7" y2="17" stroke="#9c5a52" stroke-width="2"/></svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22"><polygon points="11,2 20,11 11,20 2,11" fill="${s.bg}" stroke="white" stroke-width="2"/></svg>`;
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function JourneyMap({ stops }: { stops: JourneyStop[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    import('leaflet').then((L: any) => {
      if (cancelled || !containerRef.current) return;

      const geoStops = stops.filter(s => typeof s.lat === 'number' && typeof s.lon === 'number');
      if (geoStops.length === 0) return;

      const map = L.map(containerRef.current, { zoomControl: true, scrollWheelZoom: true });
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      const latlngs: [number, number][] = [];

      geoStops.forEach((stop, i) => {
        const ll: [number, number] = [stop.lat as number, stop.lon as number];
        latlngs.push(ll);

        const popup = `<div style="font-family:system-ui,sans-serif;font-size:13px;line-height:1.6;min-width:150px">
          <strong style="color:${TITLE_COLOR[stop.type] ?? '#374151'}">${esc(stop.label)}</strong>
          ${stop.dateRaw ? `<br/><span style="color:#8a7560">${esc(stop.dateRaw)}</span>` : ''}
          ${stop.place ? `<br/><span style="color:#5a4a38">${esc(formatPlace(stop.place))}</span>` : ''}
          <br/><span style="color:#9a9080;font-size:11px">Étape ${i + 1} / ${geoStops.length}</span>
        </div>`;

        L.marker(ll, {
          icon: L.divIcon({
            html: makeIcon(stop.type),
            className: '',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
            popupAnchor: [0, -14],
          }),
          zIndexOffset: 100,
        }).bindPopup(popup, { maxWidth: 240 }).addTo(map);
      });

      if (latlngs.length >= 2) {
        L.polyline(latlngs, {
          color: '#1e3a2f',
          weight: 2.5,
          opacity: 0.85,
          dashArray: '8 6',
        }).addTo(map);
        map.fitBounds(latlngs as Parameters<typeof map.fitBounds>[0], { padding: [48, 48], maxZoom: 10 });
      } else if (latlngs.length === 1) {
        map.setView(latlngs[0], 8);
      }
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [stops]);

  return (
    <div
      ref={containerRef}
      style={{
        height: 340,
        width: '100%',
        borderRadius: 18,
        border: '1px solid #d9e0d4',
        zIndex: 0,
      }}
    />
  );
}

// ── Main client component ──────────────────────────────────────────────────
export default function TimelineClient({
  initialStops,
  initialPersonName,
  initialPersonId,
}: TimelineClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [stops, setStops] = useState<JourneyStop[]>(initialStops);
  const [personName, setPersonName] = useState(initialPersonName);
  const [loading, setLoading] = useState(false);

  const ac = useAutocomplete(async (id, name) => {
    setLoading(true);
    setPersonName(name);
    const params = new URLSearchParams(searchParams.toString());
    params.set('focus', id);
    router.push(`/timeline?${params.toString()}`);
    try {
      const res = await fetch(`/api/journey/${encodeURIComponent(id)}`);
      const data = await res.json();
      setStops(Array.isArray(data) ? data : []);
    } catch {
      setStops([]);
    } finally {
      setLoading(false);
    }
  });

  // Sync the autocomplete query to initial person name when it changes
  useEffect(() => {
    ac.setQuery(initialPersonName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPersonName]);

  const stopsWithPlace = stops.filter(s => s.place);
  const geoStops = stops.filter(s => typeof s.lat === 'number' && typeof s.lon === 'number');
  const hasMap = geoStops.length >= 2;

  // Default person id is from the URL param or the initial prop (used for display only)
  const focusId = searchParams.get('focus') || initialPersonId;

  return (
    <div className="h-screen overflow-y-auto" style={{ background: '#f4f1ea' }}>
      {/* Header */}
      <header
        className="px-8 py-6 border-b"
        style={{ background: '#fffdf9', borderColor: '#e7e0d0' }}
      >
        <div className="max-w-5xl mx-auto">
          <h1
            className="font-serif italic"
            style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: 30, fontWeight: 500, color: '#1c1f1c', letterSpacing: '-0.02em', marginBottom: 6 }}
          >
            Parcours migratoire
          </h1>
          <p style={{ fontSize: 13.5, color: '#5a4a38', marginBottom: 20 }}>
            Les étapes de vie de <strong>{personName}</strong>, dans l&apos;ordre chronologique.
          </p>

          {/* Person selector */}
          <div className="relative" style={{ maxWidth: 320 }}>
            <label style={{ fontSize: 12, color: '#9a9080', fontWeight: 600, display: 'block', marginBottom: 4 }}>
              Changer de personne
            </label>
            <input
              type="text"
              value={ac.query}
              onChange={e => ac.search(e.target.value)}
              onBlur={() => setTimeout(() => ac.setOpen(false), 150)}
              placeholder="Tapez un nom…"
              style={{
                width: '100%',
                height: 40,
                padding: '0 14px',
                border: '1px solid #e0d8c6',
                borderRadius: 11,
                background: '#fffdf9',
                fontSize: 14,
                color: '#1c1f1c',
                outline: 'none',
              }}
            />
            {ac.open && ac.suggestions.length > 0 && (
              <ul
                style={{
                  position: 'absolute',
                  zIndex: 50,
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: 4,
                  background: '#fffdf9',
                  border: '1px solid #e7e0d0',
                  borderRadius: 11,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                  overflow: 'hidden',
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                }}
              >
                {ac.suggestions.map(p => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onMouseDown={() => ac.pick(p)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 14px',
                        fontSize: 13.5,
                        color: '#1c1f1c',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{p.displayName}</span>
                      {p.birthDate && (
                        <span style={{ color: '#9a9080', marginLeft: 8, fontSize: 12 }}>
                          {p.birthDate.substring(0, 4)}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-6" style={{ animation: 'geo-fade .4s ease both' }}>
        {loading && (
          <p style={{ color: '#9a9080', fontSize: 14, marginBottom: 16 }}>Chargement…</p>
        )}

        {!loading && stopsWithPlace.length === 0 && (
          <div
            style={{
              background: '#fffdf9',
              border: '1px solid #e9e2d2',
              borderRadius: 18,
              padding: '40px 24px',
              textAlign: 'center',
              color: '#9a9080',
              fontSize: 14,
            }}
          >
            Aucune étape trouvée pour cette personne.
          </div>
        )}

        {!loading && stopsWithPlace.length > 0 && (
          <>
            {/* ── Timeline horizontale ─────────────────────────────── */}
            <div
              style={{
                background: '#fffdf9',
                border: '1px solid #e9e2d2',
                borderRadius: 18,
                padding: '30px 24px',
                overflowX: 'auto',
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  minWidth: 'max-content',
                }}
              >
                {stopsWithPlace.map((stop, i) => {
                  const style = STOP_STYLE[stop.type] ?? STOP_STYLE.event;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                      {/* Étape */}
                      <div
                        style={{
                          width: 150,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          textAlign: 'center',
                          padding: '0 4px',
                        }}
                      >
                        {/* Icône */}
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: '50%',
                            background: style.bg,
                            border: style.border || 'none',
                            color: style.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 16,
                            fontWeight: 700,
                            flexShrink: 0,
                            marginBottom: 8,
                            boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
                          }}
                        >
                          {style.icon}
                        </div>
                        {/* Titre */}
                        <p
                          style={{
                            fontSize: 12.5,
                            fontWeight: 700,
                            color: TITLE_COLOR[stop.type] ?? '#374151',
                            margin: 0,
                            lineHeight: 1.3,
                          }}
                        >
                          {stop.label}
                        </p>
                        {/* Année */}
                        {stop.dateRaw && (
                          <p style={{ fontSize: 11.5, color: '#8a7560', margin: '3px 0 0' }}>
                            {extractYear(stop.dateRaw)}
                          </p>
                        )}
                        {/* Lieu */}
                        {stop.place && (
                          <p
                            style={{
                              fontSize: 11.5,
                              color: '#5a4a38',
                              margin: '2px 0 0',
                              lineHeight: 1.3,
                              wordBreak: 'break-word',
                            }}
                          >
                            {formatPlace(stop.place)}
                          </p>
                        )}
                      </div>

                      {/* Flèche entre étapes */}
                      {i < stopsWithPlace.length - 1 && (
                        <div style={{ flexShrink: 0, margin: '0 4px', paddingBottom: 24 }}>
                          <svg width="34" height="12" viewBox="0 0 34 12" fill="none">
                            <path d="M0 6h28M28 1l5 5-5 5" stroke="#c4b49a" strokeWidth="1.6" />
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Carte Leaflet ─────────────────────────────────────── */}
            {hasMap ? (
              <JourneyMap stops={stops} key={focusId} />
            ) : (
              <div
                style={{
                  height: 340,
                  borderRadius: 18,
                  border: '1px solid #d9e0d4',
                  background: '#fffdf9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#9a9080',
                  fontSize: 14,
                }}
              >
                Données géographiques insuffisantes pour afficher un tracé.
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
