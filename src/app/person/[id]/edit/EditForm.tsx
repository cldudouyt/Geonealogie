'use client';

import { useActionState, useState } from 'react';
import { saveEdit, type EditState } from './actions';
import type { PersonRecord } from '@/lib/gedcom-store';
import Link from 'next/link';

interface EventRow {
  type: string;
  dateRaw: string;
  place: string;
  note: string;
}

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

  const [events, setEvents] = useState<EventRow[]>(
    person.events.map(e => ({
      type: e.type,
      dateRaw: e.dateRaw || '',
      place: e.place || '',
      note: e.note || '',
    }))
  );

  const updateEvent = (i: number, field: keyof EventRow, value: string) =>
    setEvents(ev => ev.map((e, idx) => idx === i ? { ...e, [field]: value } : e));

  const removeEvent = (i: number) =>
    setEvents(ev => ev.filter((_, idx) => idx !== i));

  const addEvent = () =>
    setEvents(ev => [...ev, { type: '', dateRaw: '', place: '', note: '' }]);

  return (
    <form action={action} className="space-y-5">
      {/* Hidden field: serialized events list */}
      <input type="hidden" name="events" value={JSON.stringify(events)} />
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

      {/* Chronologie */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">Chronologie</h3>
        <p className="text-xs text-slate-400 mb-4">
          Ces événements s&apos;ajoutent à la fiche (hors naissance, décès et inhumation qui ont leurs propres champs ci-dessus).
        </p>

        <div className="space-y-3">
          {events.map((evt, i) => (
            <div key={i} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 relative">
              <button
                type="button"
                onClick={() => removeEvent(i)}
                className="absolute top-3 right-3 p-1 text-slate-400 hover:text-red-500 transition-colors"
                title="Supprimer cet événement"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pr-8">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Type <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={evt.type}
                    onChange={e => updateEvent(i, 'type', e.target.value)}
                    placeholder="ex: Mariage, Diplôme…"
                    className="w-full px-2.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Date</label>
                  <input
                    type="text"
                    value={evt.dateRaw}
                    onChange={e => updateEvent(i, 'dateRaw', e.target.value)}
                    placeholder="ex: 15 JAN 1880"
                    className="w-full px-2.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Lieu</label>
                  <input
                    type="text"
                    value={evt.place}
                    onChange={e => updateEvent(i, 'place', e.target.value)}
                    placeholder="ex: Paris"
                    className="w-full px-2.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Note</label>
                <textarea
                  value={evt.note}
                  onChange={e => updateEvent(i, 'note', e.target.value)}
                  rows={2}
                  placeholder="Description, détails…"
                  className="w-full px-2.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary transition-all resize-y"
                />
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addEvent}
          className="mt-4 flex items-center gap-1.5 text-sm text-primary hover:text-primary-light transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ajouter un événement
        </button>
      </div>

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
