'use client';

import { useActionState } from 'react';
import { saveEdit, type EditState } from './actions';
import type { PersonRecord } from '@/lib/gedcom-store';
import Link from 'next/link';

function Field({ label, name, defaultValue, placeholder, hint }: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
        {label}
      </label>
      <input
        name={name}
        defaultValue={defaultValue || ''}
        placeholder={placeholder}
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

export default function EditForm({ person }: { person: PersonRecord }) {
  const boundSave = saveEdit.bind(null, person.id);
  const [state, action, pending] = useActionState<EditState | null, FormData>(boundSave, null);

  return (
    <form action={action} className="space-y-5">
      <Section title="Identité">
        <Field label="Prénom(s)" name="givenNames" defaultValue={person.givenNames} placeholder="ex: Jean Pierre" />
        <Field label="Nom de famille" name="surname" defaultValue={person.surname} placeholder="ex: DUPONT" />
        <Field label="Surnom" name="nickname" defaultValue={person.nickname} placeholder="ex: Jeannot" />
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Sexe</label>
          <select
            name="sex"
            defaultValue={person.sex}
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary transition-all"
          >
            <option value="M">Masculin</option>
            <option value="F">Féminin</option>
            <option value="U">Inconnu</option>
          </select>
        </div>
        <Field label="Nationalité" name="nationality" defaultValue={person.nationality} />
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Adopté(e)</label>
          <select
            name="isAdopted"
            defaultValue={person.isAdopted ? 'yes' : 'no'}
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary transition-all"
          >
            <option value="no">Non</option>
            <option value="yes">Oui</option>
          </select>
        </div>
      </Section>

      <Section title="Naissance">
        <Field label="Date" name="birthDateRaw" defaultValue={person.birthDateRaw} placeholder="ex: 15 JAN 1850" hint="Format GEDCOM: JJ MOI AAAA" />
        <Field label="Lieu" name="birthPlace" defaultValue={person.birthPlaceFull || person.birthPlace} placeholder="ex: Paris, 75, Île-de-France, FRA" />
        <Field label="Date de baptême" name="chrDateRaw" defaultValue={person.chrDateRaw} placeholder="ex: 20 JAN 1850" />
        <Field label="Lieu de baptême" name="chrPlace" defaultValue={person.chrPlace} />
      </Section>

      <Section title="Décès & Inhumation">
        <Field label="Date de décès" name="deathDateRaw" defaultValue={person.deathDateRaw} placeholder="ex: 3 MAR 1920" />
        <Field label="Lieu de décès" name="deathPlace" defaultValue={person.deathPlaceFull || person.deathPlace} />
        <Field label="Date d'inhumation" name="burialDateRaw" defaultValue={person.burialDateRaw} />
        <Field label="Lieu d'inhumation" name="burialPlace" defaultValue={person.burialPlace} />
      </Section>

      <Section title="Profession">
        <div className="sm:col-span-2">
          <Field label="Profession principale" name="occupation" defaultValue={person.occupation} placeholder="ex: Agriculteur" />
        </div>
      </Section>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">Notes</h3>
        <textarea
          name="notes"
          defaultValue={person.notes || ''}
          rows={6}
          placeholder="Informations complémentaires..."
          className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-y"
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
          {pending ? 'Enregistrement…' : 'Enregistrer les modifications'}
        </button>
        <Link
          href={`/person/${person.id}`}
          className="px-6 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          Annuler
        </Link>
      </div>
    </form>
  );
}
