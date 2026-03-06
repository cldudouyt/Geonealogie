'use client';

import { useActionState, useState } from 'react';
import { createPerson, type NewPersonState } from './actions';
import Link from 'next/link';

function Field({ label, name, placeholder, hint, required }: {
  label: string; name: string; placeholder?: string; hint?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        name={name}
        placeholder={placeholder}
        required={required}
        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
      />
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
      <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function PersonSearch({ onSelect }: { onSelect: (id: string, name: string) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ id: string; displayName: string; birthYear?: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async (q: string) => {
    setQuery(q);
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/persons?autocomplete=true&q=${encodeURIComponent(q)}&limit=8`);
      const data = await res.json();
      setResults(data.persons || []);
    } finally { setLoading(false); }
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={e => search(e.target.value)}
        placeholder="Rechercher une personne existante…"
        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary transition-all"
      />
      {loading && <span className="absolute right-3 top-3 text-xs text-slate-400">…</span>}
      {results.length > 0 && (
        <ul className="absolute z-10 left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden max-h-48 overflow-y-auto">
          {results.map(p => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => { onSelect(p.id, p.displayName); setResults([]); setQuery(p.displayName); }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {p.displayName} {p.birthYear && <span className="text-slate-400">({p.birthYear})</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function NewPersonPage() {
  const [state, action, pending] = useActionState<NewPersonState | null, FormData>(createPerson, null);
  const [relPersonId, setRelPersonId] = useState('');
  const [relType, setRelType] = useState('');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Retour
          </Link>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Ajouter un membre</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <form action={action} className="space-y-5">
          <Section title="Identité">
            <Field label="Prénom(s)" name="givenNames" placeholder="ex: Marie Anne" required />
            <Field label="Nom de famille" name="surname" placeholder="ex: DUPONT" required />
            <Field label="Surnom" name="nickname" placeholder="ex: Mamie" />
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Sexe <span className="text-red-400">*</span>
              </label>
              <select
                name="sex"
                required
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary transition-all"
              >
                <option value="">-- Choisir --</option>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
                <option value="U">Inconnu</option>
              </select>
            </div>
            <Field label="Nationalité" name="nationality" />
          </Section>

          <Section title="Naissance">
            <Field label="Date" name="birthDateRaw" placeholder="ex: 15 JAN 1900" hint="Format: JJ MOI AAAA" />
            <Field label="Lieu" name="birthPlace" placeholder="ex: Paris, 75, Île-de-France, FRA" />
            <Field label="Date de baptême" name="chrDateRaw" placeholder="ex: 20 JAN 1900" />
            <Field label="Lieu de baptême" name="chrPlace" />
          </Section>

          <Section title="Décès & Inhumation">
            <Field label="Date de décès" name="deathDateRaw" placeholder="ex: 3 MAR 1970" />
            <Field label="Lieu de décès" name="deathPlace" />
            <Field label="Date d'inhumation" name="burialDateRaw" />
            <Field label="Lieu d'inhumation" name="burialPlace" />
          </Section>

          <Section title="Profession">
            <div className="sm:col-span-2">
              <Field label="Profession" name="occupation" placeholder="ex: Institutrice" />
            </div>
          </Section>

          {/* Relationship */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">Lien familial</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Type de lien</label>
                <select
                  name="relType"
                  value={relType}
                  onChange={e => setRelType(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary transition-all"
                >
                  <option value="">Aucun lien</option>
                  <option value="child">Enfant de…</option>
                  <option value="parent">Parent de…</option>
                  <option value="spouse">Conjoint(e) de…</option>
                </select>
              </div>

              {relType && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    {relType === 'child' ? 'Parent' : relType === 'parent' ? 'Enfant' : 'Conjoint(e)'}
                  </label>
                  <PersonSearch onSelect={(id) => setRelPersonId(id)} />
                  <input type="hidden" name="relPersonId" value={relPersonId} />
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">Notes</h3>
            <textarea
              name="notes"
              rows={4}
              placeholder="Informations complémentaires…"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary transition-all resize-y"
            />
          </div>

          {state?.error && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
              {state.error}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {pending ? 'Création…' : 'Ajouter ce membre'}
            </button>
            <Link href="/" className="px-6 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Annuler
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
