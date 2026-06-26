'use client';

import { useState, useEffect, useRef } from 'react';

interface GeoStats {
  gedcomPlacesWithoutCoords: number;
  gedcomUncached: number;
  overridePlacesWithoutCoords: number;
  total: number;
  estimatedMinutes: number;
}

interface LogLine {
  type: 'success' | 'error' | 'info';
  text: string;
}

export default function GeocodePage() {
  const [stats, setStats] = useState<GeoStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<LogLine[]>([]);
  const [error, setError] = useState('');
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/admin/geocode')
      .then(r => r.json())
      .then((data: GeoStats) => setStats(data))
      .catch(() => setError('Impossible de charger les statistiques'))
      .finally(() => setLoadingStats(false));
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  const runGeocode = async () => {
    setRunning(true);
    setLog([]);
    setError('');

    try {
      const res = await fetch('/api/geocode/batch', { method: 'POST' });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data:')) continue;
          const raw = line.slice(5).trim();
          try {
            const evt = JSON.parse(raw) as {
              type: 'success' | 'error' | 'done' | 'info';
              place?: string;
              lat?: number;
              lng?: number;
              message?: string;
              total?: number;
              success?: number;
              failed?: number;
            };

            if (evt.type === 'success') {
              setLog(prev => [...prev, {
                type: 'success',
                text: `✓ ${evt.place} → ${evt.lat?.toFixed(4)}, ${evt.lng?.toFixed(4)}`,
              }]);
            } else if (evt.type === 'error') {
              setLog(prev => [...prev, {
                type: 'error',
                text: `✗ ${evt.place || ''}${evt.message ? ` — ${evt.message}` : ''}`,
              }]);
            } else if (evt.type === 'done') {
              setLog(prev => [...prev, {
                type: 'info',
                text: `Terminé — ${evt.success} succès, ${evt.failed} échec(s) sur ${evt.total} lieux`,
              }]);
              // Refresh stats
              const s = await fetch('/api/admin/geocode').then(r => r.json()) as GeoStats;
              setStats(s);
            }
          } catch {
            // ignore malformed SSE line
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setRunning(false);
    }
  };

  const total = stats?.total ?? 0;

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px' }}>
      {/* Header */}
      <h1 style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 30,
        fontWeight: 500,
        letterSpacing: '-0.02em',
        color: '#1c1f1c',
        margin: '0 0 10px',
      }}>
        Géocodage automatique
      </h1>
      <p style={{ fontSize: 14, color: '#5a5e52', margin: '0 0 32px', lineHeight: 1.6 }}>
        Convertit les lieux GEDCOM et saisis manuellement en coordonnées, sauvegardées dans la base.
      </p>

      {/* Stats table */}
      {loadingStats ? (
        <p style={{ fontSize: 13, color: '#8a8474' }}>Chargement des statistiques…</p>
      ) : stats ? (
        <div style={{
          borderRadius: 16,
          border: '1px solid #e9e2d2',
          overflow: 'hidden',
          marginBottom: 28,
        }}>
          <StatRow
            label="Lieux GEDCOM sans coordonnées"
            value={stats.gedcomUncached}
            type="normal"
          />
          <StatRow
            label="Lieux manuels sans coords"
            value={stats.overridePlacesWithoutCoords}
            type="amber"
          />
          <StatRow
            label="Total à géocoder"
            value={stats.total}
            type="bold"
          />
          <StatRow
            label="Durée estimée"
            value={stats.total === 0 ? '–' : `~${stats.estimatedMinutes} min`}
            type="normal"
            last
          />
        </div>
      ) : null}

      {/* Launch button */}
      <button
        onClick={runGeocode}
        disabled={running || total === 0}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 9,
          background: '#1e3a2f',
          color: '#f1ede2',
          padding: '11px 20px',
          borderRadius: 11,
          border: 'none',
          fontWeight: 600,
          fontSize: 14,
          cursor: running || total === 0 ? 'not-allowed' : 'pointer',
          opacity: running || total === 0 ? 0.5 : 1,
          transition: 'opacity .15s',
        }}
      >
        {running ? (
          <>
            <SpinnerIcon />
            En cours…
          </>
        ) : total === 0 ? (
          <>
            <PinIcon />
            Tout est géocodé
          </>
        ) : (
          <>
            <PinIcon />
            Lancer le géocodage ({total} lieu{total > 1 ? 'x' : ''})
          </>
        )}
      </button>
      {running && (
        <span style={{ marginLeft: 14, fontSize: 12, color: '#8a8474' }}>Ne pas fermer cette page</span>
      )}

      {error && (
        <p style={{
          marginTop: 16,
          fontSize: 13,
          color: '#c0392b',
          background: '#fae6e3',
          border: '1px solid #e3c4c0',
          borderRadius: 10,
          padding: '10px 14px',
        }}>
          {error}
        </p>
      )}

      {/* Log journal */}
      {(log.length > 0 || running) && (
        <div style={{
          marginTop: 22,
          border: '1px solid #e9e2d2',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          <div style={{
            background: '#f1f4ef',
            padding: '8px 14px',
            fontSize: 11.5,
            fontWeight: 700,
            color: '#6b7568',
            letterSpacing: '.01em',
          }}>
            Journal de la dernière exécution
          </div>
          <div
            ref={logRef}
            style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize: 11.5,
              padding: '13px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
              maxHeight: 180,
              overflowY: 'auto',
              background: '#fffdf9',
            }}
          >
            {log.length === 0 ? (
              <span style={{ color: '#8a8474' }}>Démarrage…</span>
            ) : (
              log.map((line, i) => (
                <div
                  key={i}
                  style={{
                    color: line.type === 'success'
                      ? '#2f5142'
                      : line.type === 'error'
                      ? '#c0392b'
                      : '#8a8474',
                  }}
                >
                  {line.text}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatRow({
  label,
  value,
  type,
  last,
}: {
  label: string;
  value: number | string;
  type: 'normal' | 'amber' | 'bold';
  last?: boolean;
}) {
  const isBold = type === 'bold';
  const isAmber = type === 'amber';

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '14px 20px',
      borderBottom: last ? 'none' : '1px solid #f1ebdd',
    }}>
      <span style={{
        fontSize: 14,
        color: isBold ? '#1c1f1c' : '#5a5e52',
        fontWeight: isBold ? 600 : 400,
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 14,
        color: isBold ? '#1c1f1c' : isAmber && Number(value) > 0 ? '#b8860b' : '#5a5e52',
        fontWeight: isBold || (isAmber && Number(value) > 0) ? 700 : 400,
      }}>
        {value}
      </span>
    </div>
  );
}

function PinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      style={{ animation: 'spin 1s linear infinite' }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="10" strokeOpacity=".25" />
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}
