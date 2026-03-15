'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface GeoStats {
  gedcomPlacesWithoutCoords: number;
  gedcomUncached: number;
  overridePlacesWithoutCoords: number;
  total: number;
  estimatedMinutes: number;
}

interface GeoResult {
  geocoded: number;
  totalAttempted: number;
  log: string[];
}

export default function GeocodePage() {
  const [stats, setStats] = useState<GeoStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<GeoResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/geocode')
      .then(r => r.json())
      .then(setStats)
      .catch(() => setError('Impossible de charger les statistiques'))
      .finally(() => setLoadingStats(false));
  }, []);

  const runGeocode = async () => {
    setRunning(true);
    setResult(null);
    setError('');
    try {
      const res = await fetch('/api/admin/geocode', { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: GeoResult = await res.json();
      setResult(data);
      // Refresh stats
      const s = await fetch('/api/admin/geocode').then(r => r.json());
      setStats(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: '#3d2e1e' }}>Géocodage automatique</h1>
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">← Accueil</Link>
      </div>

      <p className="text-sm text-slate-600">
        Géocode tous les lieux sans coordonnées (GEDCOM + événements saisis manuellement).
        Les coordonnées des overrides sont sauvegardées dans Neo4j pour persister sur Vercel.
      </p>

      {/* Stats */}
      {loadingStats ? (
        <div className="text-sm text-slate-400">Chargement des statistiques…</div>
      ) : stats ? (
        <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
          <StatRow label="Lieux GEDCOM sans coords (non cachés)" value={stats.gedcomUncached} />
          <StatRow label="Lieux manuels (overrides) sans coords" value={stats.overridePlacesWithoutCoords} highlight />
          <StatRow label="Total à géocoder" value={stats.total} bold />
          <StatRow label="Durée estimée" value={stats.total === 0 ? '–' : `~${stats.estimatedMinutes} min`} />
        </div>
      ) : null}

      {/* Action */}
      <div className="flex items-center gap-3">
        <button
          onClick={runGeocode}
          disabled={running || stats?.total === 0}
          className="px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-40"
          style={{ background: '#166534' }}
        >
          {running ? (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Géocodage en cours…
            </span>
          ) : stats?.total === 0 ? 'Tout est géocodé ✓' : `Lancer le géocodage (${stats?.total ?? '?'} lieux)`}
        </button>
        {running && (
          <span className="text-xs text-slate-400">Ne pas fermer cette page</span>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-3">
          <div className="rounded-lg px-4 py-3 text-sm font-medium"
            style={{ background: result.geocoded > 0 ? '#f0fdf4' : '#fafafa',
              border: `1px solid ${result.geocoded > 0 ? '#86efac' : '#e2e8f0'}`,
              color: result.geocoded > 0 ? '#166534' : '#64748b' }}>
            {result.geocoded} lieu{result.geocoded > 1 ? 'x' : ''} géocodé{result.geocoded > 1 ? 's' : ''}
            {' '}sur {result.totalAttempted} traité{result.totalAttempted > 1 ? 's' : ''}
          </div>
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 border-b border-slate-200">
              Journal
            </div>
            <div className="max-h-64 overflow-y-auto font-mono text-xs p-3 space-y-0.5">
              {result.log.length === 0
                ? <span className="text-slate-400">Aucun lieu à traiter.</span>
                : result.log.map((line, i) => (
                    <div key={i} style={{ color: line.includes('non trouvé') ? '#ef4444' : '#166534' }}>
                      {line}
                    </div>
                  ))
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value, highlight, bold }: {
  label: string; value: number | string; highlight?: boolean; bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className={`text-sm ${bold ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>{label}</span>
      <span className={`text-sm font-mono ${highlight && Number(value) > 0 ? 'text-amber-600 font-semibold' : bold ? 'text-slate-800 font-semibold' : 'text-slate-500'}`}>
        {value}
      </span>
    </div>
  );
}
