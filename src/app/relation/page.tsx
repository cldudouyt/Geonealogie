'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import type { PersonSummary } from '@/lib/types';

interface RelationStep {
  personId: string;
  displayName: string;
  relation: string;
}

function useAutocomplete(onSelect: (id: string, name: string) => void) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PersonSummary[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedName, setSelectedName] = useState('');
  const [selectedId, setSelectedId] = useState('');

  const search = useCallback(async (q: string) => {
    setQuery(q);
    setSelectedId('');
    if (q.length < 2) { setSuggestions([]); setOpen(false); return; }
    const res = await fetch(`/api/persons?autocomplete=true&q=${encodeURIComponent(q)}&limit=8`);
    const data = await res.json();
    setSuggestions(data.persons || []);
    setOpen(true);
  }, []);

  const pick = (p: PersonSummary) => {
    setSelectedId(p.id);
    setSelectedName(p.displayName);
    setQuery(p.displayName);
    setSuggestions([]);
    setOpen(false);
    onSelect(p.id, p.displayName);
  };

  return { query, search, suggestions, open, pick, selectedId, selectedName };
}

const RELATION_LABELS: Record<string, string> = {
  parent: 'est parent de',
  enfant: 'est enfant de',
  conjoint: 'est conjoint de',
  départ: '',
};

export default function RelationPage() {
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [path, setPath] = useState<RelationStep[] | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const from = useAutocomplete((id) => setFromId(id));
  const to = useAutocomplete((id) => setToId(id));

  const find = async () => {
    if (!fromId || !toId) return;
    setLoading(true);
    setPath(undefined);
    const res = await fetch(`/api/relation?from=${fromId}&to=${toId}`);
    const data = await res.json();
    setPath(data.path);
    setLoading(false);
  };

  return (
    <div className="h-screen overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link href="/" className="text-sm text-primary hover:underline flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Arbre
          </Link>
          <h1 className="text-lg font-bold text-slate-800 dark:text-slate-200">Chemin de parenté</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Trouvez comment deux personnes de l&apos;arbre sont liées.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Autocomplete label="Première personne" hook={from} />
            <Autocomplete label="Deuxième personne" hook={to} />
          </div>

          <button
            onClick={find}
            disabled={!fromId || !toId || loading}
            className="w-full py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-light transition-colors disabled:opacity-50"
          >
            {loading ? 'Recherche...' : 'Trouver le lien'}
          </button>
        </div>

        {path === null && (
          <div className="bg-white dark:bg-slate-900 rounded-xl p-8 shadow-sm text-center text-slate-400">
            Aucun lien trouvé entre ces deux personnes.
          </div>
        )}

        {path && path.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800">
              <p className="text-sm text-slate-500">{path.length - 1} étape{path.length > 2 ? 's' : ''} de parenté</p>
            </div>
            <ol className="divide-y divide-slate-100 dark:divide-slate-800">
              {path.map((step, i) => (
                <li key={step.personId} className="flex items-center gap-3 px-6 py-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <Link href={`/person/${step.personId}`} className="text-sm font-medium hover:text-primary transition-colors">
                      {step.displayName}
                    </Link>
                    {i > 0 && (
                      <p className="text-xs text-slate-400">{RELATION_LABELS[step.relation] ?? step.relation} {path[i - 1]?.displayName}</p>
                    )}
                  </div>
                  {i === 0 && <span className="text-xs text-slate-400 shrink-0">point de départ</span>}
                  {i === path.length - 1 && i > 0 && <span className="text-xs text-primary shrink-0">destination</span>}
                </li>
              ))}
            </ol>
          </div>
        )}
      </main>
    </div>
  );
}

function Autocomplete({ label, hook }: { label: string; hook: ReturnType<typeof useAutocomplete> }) {
  return (
    <div className="relative">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
      <input
        type="text"
        value={hook.query}
        onChange={e => hook.search(e.target.value)}
        placeholder="Tapez un nom..."
        className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
      />
      {hook.open && hook.suggestions.length > 0 && (
        <ul className="absolute z-20 top-full mt-1 left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden">
          {hook.suggestions.map(p => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => hook.pick(p)}
                className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <span className="font-medium">{p.displayName}</span>
                {p.birthDate && <span className="text-slate-400 ml-2 text-xs">{p.birthDate.substring(0,4)}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {hook.selectedId && (
        <p className="text-xs text-primary mt-1">✓ {hook.selectedName} sélectionné(e)</p>
      )}
    </div>
  );
}
