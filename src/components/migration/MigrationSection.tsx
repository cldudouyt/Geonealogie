'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

const MigrationMap = dynamic(() => import('./MigrationMap'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 320, background: '#f5eddf', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a89070', fontSize: 13 }}>
      Chargement de la carte…
    </div>
  ),
});

export interface JourneyStop {
  type: 'birth' | 'event' | 'death' | 'burial';
  label: string;
  dateRaw?: string;
  place?: string;
  lat?: number | null;
  lon?: number | null;
}

interface MigrationSectionProps {
  stops: JourneyStop[];
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

export default function MigrationSection({ stops }: MigrationSectionProps) {
  const [showMap, setShowMap] = useState(true);

  const stopsWithPlace = stops.filter(s => s.place);
  const stopsWithCoords = stops.filter(s => s.lat != null && s.lon != null);

  if (stopsWithPlace.length < 2) return null;

  return (
    <div className="dark:bg-slate-900 rounded-xl p-6 shadow-sm mt-6" style={{ background: '#fffaf5', border: '1px solid #e8dcc8' }}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold" style={{ color: '#3d2e1e' }}>Parcours de migration</h2>
        {stopsWithCoords.length >= 1 && (
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
        )}
      </div>

      {/* Horizontal step timeline */}
      <div className="overflow-x-auto pb-2">
        <div className="flex items-start min-w-max gap-0">
          {stopsWithPlace.map((stop, i) => (
            <div key={i} className="flex items-center">
              {/* Stop card */}
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

              {/* Connector arrow */}
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

      {/* Map (togglable) */}
      {showMap && (
        <div className="mt-4">
          <MigrationMap stops={stopsWithCoords.length >= 1 ? stops : []} />
        </div>
      )}

      {/* Note if no coords */}
      {stopsWithCoords.length === 0 && (
        <p className="text-xs mt-3" style={{ color: '#a89070' }}>
          Aucune coordonnée disponible — la carte ne peut pas être affichée.
        </p>
      )}
    </div>
  );
}
