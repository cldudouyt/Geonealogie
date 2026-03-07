'use client';

import { useActionState, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createPerson, type NewPersonState } from './actions';
import Link from 'next/link';

// ─── Reusable Field ────────────────────────────────────────────────────────────

function Field({
  label, name, placeholder, hint, required, type = 'text',
}: {
  label: string; name: string; placeholder?: string; hint?: string; required?: boolean; type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        name={name}
        type={type}
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

// ─── Person Search ─────────────────────────────────────────────────────────────

function PersonSearch({ onSelect }: { onSelect: (id: string, name: string) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ id: string; displayName: string; birthYear?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setResults([]);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
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

// ─── Duplicate Detection ───────────────────────────────────────────────────────

function DuplicateWarning({ givenNames, surname }: { givenNames: string; surname: string }) {
  const [duplicates, setDuplicates] = useState<{ id: string; displayName: string; birthYear?: string }[]>([]);

  useEffect(() => {
    const q = `${givenNames} ${surname}`.trim();
    if (q.length < 3) { setDuplicates([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/persons?autocomplete=true&q=${encodeURIComponent(q)}&limit=5`);
        const data = await res.json();
        setDuplicates(data.persons || []);
      } catch { setDuplicates([]); }
    }, 500);
    return () => clearTimeout(timer);
  }, [givenNames, surname]);

  if (duplicates.length === 0) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-4 py-3">
      <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-2">
        Des personnes similaires existent déjà :
      </p>
      <ul className="space-y-1">
        {duplicates.map(p => (
          <li key={p.id}>
            <Link
              href={`/person/${p.id}`}
              target="_blank"
              className="text-sm text-amber-700 dark:text-amber-400 hover:underline"
            >
              {p.displayName} {p.birthYear && `(${p.birthYear})`}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Multiple Relations ────────────────────────────────────────────────────────

interface Relation {
  key: number;
  relType: 'child' | 'parent' | 'spouse' | '';
  relPersonId: string;
  relPersonName: string;
}

function RelationRow({
  rel, index, onChange, onRemove,
}: {
  rel: Relation; index: number; onChange: (r: Relation) => void; onRemove: () => void;
}) {
  return (
    <div className="flex gap-2 items-start">
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <select
          name={`relations[${index}][relType]`}
          value={rel.relType}
          onChange={e => onChange({ ...rel, relType: e.target.value as Relation['relType'] })}
          className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary transition-all"
        >
          <option value="">-- Type de lien --</option>
          <option value="child">Enfant de…</option>
          <option value="parent">Parent de…</option>
          <option value="spouse">Conjoint(e) de…</option>
        </select>
        {rel.relType ? (
          <div>
            <PersonSearch onSelect={(id, name) => onChange({ ...rel, relPersonId: id, relPersonName: name })} />
            <input type="hidden" name={`relations[${index}][relPersonId]`} value={rel.relPersonId} />
          </div>
        ) : (
          <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-400">
            Choisir un type d'abord
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="mt-1 p-2 text-slate-400 hover:text-red-500 transition-colors"
        title="Supprimer ce lien"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function NewPersonPage() {
  const router = useRouter();
  const [state, action, pending] = useActionState<NewPersonState | null, FormData>(createPerson, null);

  // Duplicate detection inputs
  const [givenNames, setGivenNames] = useState('');
  const [surname, setSurname] = useState('');

  // Multiple relations
  const [relations, setRelations] = useState<Relation[]>([]);
  const relKeyRef = useRef(0);

  const addRelation = () => {
    relKeyRef.current++;
    setRelations(prev => [...prev, { key: relKeyRef.current, relType: '', relPersonId: '', relPersonName: '' }]);
  };

  const updateRelation = (key: number, r: Relation) =>
    setRelations(prev => prev.map(x => (x.key === key ? r : x)));

  const removeRelation = (key: number) =>
    setRelations(prev => prev.filter(x => x.key !== key));

  // Redirect on success
  useEffect(() => {
    if (state?.success && state.personId) {
      // Default: go to person profile; user can choose tree via buttons below
    }
  }, [state]);

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

      {/* Success banner with redirect choice */}
      {state?.success && state.personId && (
        <div className="max-w-3xl mx-auto px-6 pt-6">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-5">
            <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-3">
              Membre ajouté avec succès !
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push(`/person/${state.personId}`)}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Voir la fiche
              </button>
              <button
                type="button"
                onClick={() => router.push(`/?focus=${state.personId}`)}
                className="px-4 py-2 border border-primary text-primary rounded-lg text-sm font-medium hover:bg-primary/5 transition-colors"
              >
                Voir dans l&apos;arbre
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Ajouter un autre membre
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-6 py-8">
        <form action={action} className="space-y-5">

          {/* Identity */}
          <Section title="Identité">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Prénom(s) <span className="text-red-400">*</span>
              </label>
              <input
                name="givenNames"
                placeholder="ex: Marie Anne"
                required
                value={givenNames}
                onChange={e => setGivenNames(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Nom de famille <span className="text-red-400">*</span>
              </label>
              <input
                name="surname"
                placeholder="ex: DUPONT"
                required
                value={surname}
                onChange={e => setSurname(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
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
            <div className="sm:col-span-2 flex items-center gap-3">
              <input
                type="checkbox"
                id="isAdopted"
                name="isAdopted"
                value="yes"
                className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <label htmlFor="isAdopted" className="text-sm text-slate-700 dark:text-slate-300">
                Personne adoptée
              </label>
            </div>
          </Section>

          {/* Duplicate warning */}
          {(givenNames.length > 1 || surname.length > 1) && (
            <DuplicateWarning givenNames={givenNames} surname={surname} />
          )}

          {/* Birth */}
          <Section title="Naissance">
            <Field
              label="Date"
              name="birthDateRaw"
              placeholder="ex: 15 JAN 1900"
              hint="Formats acceptés : JJ/MM/AAAA, AAAA-MM-JJ, 15 JAN 1900"
            />
            <Field label="Lieu (court)" name="birthPlace" placeholder="ex: Paris, France" />
            <Field label="Lieu (complet)" name="birthPlaceFull" placeholder="ex: Paris, 75, Île-de-France, FRA" />
            <Field label="Date de baptême" name="chrDateRaw" placeholder="ex: 20 JAN 1900" hint="Formats acceptés : JJ/MM/AAAA, …" />
            <Field label="Lieu de baptême" name="chrPlace" />
          </Section>

          {/* Death */}
          <Section title="Décès & Inhumation">
            <Field label="Date de décès" name="deathDateRaw" placeholder="ex: 3 MAR 1970" hint="Formats acceptés : JJ/MM/AAAA, AAAA-MM-JJ, …" />
            <Field label="Lieu de décès (court)" name="deathPlace" placeholder="ex: Lyon, France" />
            <Field label="Lieu de décès (complet)" name="deathPlaceFull" placeholder="ex: Lyon, 69, Rhône-Alpes, FRA" />
            <Field label="Date d'inhumation" name="burialDateRaw" hint="Formats acceptés : JJ/MM/AAAA, …" />
            <Field label="Lieu d'inhumation" name="burialPlace" />
          </Section>

          {/* Occupation */}
          <Section title="Profession">
            <div className="sm:col-span-2">
              <Field label="Profession" name="occupation" placeholder="ex: Institutrice" />
            </div>
          </Section>

          {/* Relations */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Liens familiaux</h3>
              <button
                type="button"
                onClick={addRelation}
                className="text-xs px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors font-medium"
              >
                + Ajouter un lien
              </button>
            </div>
            {relations.length === 0 ? (
              <p className="text-sm text-slate-400">Aucun lien familial. Cliquez sur « Ajouter un lien » pour en créer un.</p>
            ) : (
              <div className="space-y-3">
                {relations.map((rel, idx) => (
                  <RelationRow
                    key={rel.key}
                    rel={rel}
                    index={idx}
                    onChange={r => updateRelation(rel.key, r)}
                    onRemove={() => removeRelation(rel.key)}
                  />
                ))}
              </div>
            )}
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
