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
      <label className="block text-sm font-medium text-[#5a5e52] mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="w-full px-3.5 py-2.5 text-sm bg-[#fffdf9] text-[#1c1f1c] border border-[#e0d8c6] rounded-[11px] outline-none focus:border-[#2f5142] focus:ring-2 focus:ring-[#2f5142]/10 transition-all"
      />
      {hint && <p className="text-xs text-[#8a8474] mt-1">{hint}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#fffdf9] border border-[#e7e0d0] rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-[#8a8474] uppercase tracking-[0.14em] mb-4">{title}</h3>
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
        className="w-full px-3.5 py-2.5 text-sm bg-[#fffdf9] text-[#1c1f1c] border border-[#e0d8c6] rounded-[11px] outline-none focus:border-[#2f5142] transition-all"
      />
      {loading && <span className="absolute right-3 top-3 text-xs text-[#9aa89b]">…</span>}
      {results.length > 0 && (
        <ul className="absolute z-10 left-0 right-0 mt-1 bg-[#fffdf9] border border-[#e7e0d0] rounded-lg shadow-xl overflow-hidden max-h-48 overflow-y-auto">
          {results.map(p => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => { onSelect(p.id, p.displayName); setResults([]); setQuery(p.displayName); }}
                className="w-full text-left px-4 py-2 text-sm text-[#1c1f1c] hover:bg-[#f1f4ef] transition-colors"
              >
                {p.displayName} {p.birthYear && <span className="text-[#9aa89b]">({p.birthYear})</span>}
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
    <div className="bg-[#f7e6d6] border border-[#eed9bd] rounded-lg px-4 py-3">
      <p className="text-sm font-medium text-[#b5651d] mb-2">
        Des personnes similaires existent déjà :
      </p>
      <ul className="space-y-1">
        {duplicates.map(p => (
          <li key={p.id}>
            <Link
              href={`/person/${p.id}`}
              target="_blank"
              className="text-sm text-[#b5651d] hover:underline"
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
          className="w-full px-3.5 py-2.5 text-sm bg-[#fffdf9] text-[#1c1f1c] border border-[#e0d8c6] rounded-[11px] outline-none focus:border-[#2f5142] transition-all"
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
          <div className="bg-[#f1f4ef] border border-[#e0d8c6] rounded-[11px] px-3.5 py-2.5 text-sm text-[#9aa89b]">
            Choisir un type d'abord
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="mt-1 p-2 text-[#9aa89b] hover:text-[#b91c1c] transition-colors"
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
    <div className="min-h-screen bg-[#f4f1ea]">
      <header className="bg-[#fffdf9] border-b border-[#e7e0d0] px-6 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-sm text-[#8a8474] hover:text-[#2f5142] flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Retour
          </Link>
          <span className="text-[#e0d8c6]">/</span>
          <h1 className="text-sm font-semibold text-[#1c1f1c]" style={{ fontFamily: 'var(--font-serif, Georgia, serif)' }}>Ajouter un membre</h1>
        </div>
      </header>

      {/* Success banner with redirect choice */}
      {state?.success && state.personId && (
        <div className="max-w-3xl mx-auto px-6 pt-6">
          <div className="bg-[#eef2ec] border border-[#cfdccf] rounded-2xl p-5">
            <p className="text-sm font-medium text-[#2f5142] mb-3">
              Membre ajouté avec succès !
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push(`/person/${state.personId}`)}
                className="px-4 py-2 bg-[#1e3a2f] text-[#f1ede2] rounded-[10px] text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Voir la fiche
              </button>
              <button
                type="button"
                onClick={() => router.push(`/?focus=${state.personId}`)}
                className="px-4 py-2 border border-[#2f5142] text-[#2f5142] rounded-[10px] text-sm font-medium hover:bg-[#eef2ec] transition-colors"
              >
                Voir dans l&apos;arbre
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 border border-[#e0d8c6] bg-[#fffdf9] text-[#5a5e52] rounded-[10px] text-sm hover:bg-[#f1f4ef] transition-colors"
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
              <label className="block text-sm font-medium text-[#5a5e52] mb-1.5">
                Prénom(s) <span className="text-red-400">*</span>
              </label>
              <input
                name="givenNames"
                placeholder="ex: Marie Anne"
                required
                value={givenNames}
                onChange={e => setGivenNames(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#fffdf9] text-[#1c1f1c] border border-[#e0d8c6] rounded-[11px] outline-none focus:border-[#2f5142] focus:ring-2 focus:ring-[#2f5142]/10 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5a5e52] mb-1.5">
                Nom de famille <span className="text-red-400">*</span>
              </label>
              <input
                name="surname"
                placeholder="ex: DUPONT"
                required
                value={surname}
                onChange={e => setSurname(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#fffdf9] text-[#1c1f1c] border border-[#e0d8c6] rounded-[11px] outline-none focus:border-[#2f5142] focus:ring-2 focus:ring-[#2f5142]/10 transition-all"
              />
            </div>
            <Field label="Surnom" name="nickname" placeholder="ex: Mamie" />
            <div>
              <label className="block text-sm font-medium text-[#5a5e52] mb-1.5">
                Sexe <span className="text-red-400">*</span>
              </label>
              <select
                name="sex"
                required
                className="w-full px-3.5 py-2.5 text-sm bg-[#fffdf9] text-[#1c1f1c] border border-[#e0d8c6] rounded-[11px] outline-none focus:border-[#2f5142] transition-all"
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
                className="w-4 h-4 rounded border-[#e0d8c6] accent-[#2f5142] focus:ring-[#2f5142]"
              />
              <label htmlFor="isAdopted" className="text-sm text-[#5a5e52]">
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
          <div className="bg-[#fffdf9] border border-[#e7e0d0] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[#8a8474] uppercase tracking-[0.14em]">Liens familiaux</h3>
              <button
                type="button"
                onClick={addRelation}
                className="text-xs px-3 py-1.5 bg-[#eef2ec] text-[#2f5142] rounded-full hover:bg-[#e3eae1] transition-colors font-medium"
              >
                + Ajouter un lien
              </button>
            </div>
            {relations.length === 0 ? (
              <p className="text-sm text-[#8a8474]">Aucun lien familial. Cliquez sur « Ajouter un lien » pour en créer un.</p>
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
          <div className="bg-[#fffdf9] border border-[#e7e0d0] rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-[#8a8474] uppercase tracking-[0.14em] mb-4">Notes</h3>
            <textarea
              name="notes"
              rows={4}
              placeholder="Informations complémentaires…"
              className="w-full px-3.5 py-2.5 text-sm bg-[#fffdf9] text-[#1c1f1c] border border-[#e0d8c6] rounded-[11px] outline-none focus:border-[#2f5142] transition-all resize-y"
            />
          </div>

          {state?.error && (
            <p className="text-sm text-[#b91c1c] bg-[#fef2f2] border border-[#fca5a5] rounded-lg px-4 py-3">
              {state.error}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="px-6 py-2.5 bg-[#1e3a2f] text-[#f1ede2] rounded-[10px] text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {pending ? 'Création…' : 'Ajouter ce membre'}
            </button>
            <Link href="/" className="px-6 py-2.5 border border-[#e0d8c6] bg-[#fffdf9] text-[#5a5e52] rounded-[10px] text-sm hover:bg-[#f1f4ef] transition-colors">
              Annuler
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
