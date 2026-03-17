'use client';

import { useActionState, useState, useRef } from 'react';
import Image from 'next/image';
import { upload } from '@vercel/blob/client';
import { saveEdit, type EditState } from './actions';
import type { PersonRecord } from '@/lib/gedcom-store';
import { Monogram } from '@/components/ui/Monogram';
import PlaceAutocomplete from '@/components/ui/PlaceAutocomplete';
import Link from 'next/link';

interface EventRow {
  type: string;
  dateRaw: string;
  place: string;
  note: string;
  lat?: number | null;
  lon?: number | null;
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

  // Avatar state: photoUrl is the clean URL (saved to DB), displayPhotoUrl adds ?t= for cache-busting
  const [photoUrl, setPhotoUrl] = useState<string>(person.photoUrl || '');
  const [displayPhotoUrl, setDisplayPhotoUrl] = useState<string>(person.photoUrl || '');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setAvatarError('');
    try {
      const MAX_SIZE = 10 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        setAvatarError('Fichier trop volumineux (max 10 Mo)');
        return;
      }
      const rawExt = file.type.split('/')[1] ?? 'jpg';
      const ext = rawExt.replace('jpeg', 'jpg').replace('heif', 'heic');
      // Full path so the blob is stored at documents/{id}/avatar-{id}.ext
      const pathname = `documents/${person.id}/avatar-${person.id}.${ext}`;

      // In production: direct browser→Blob upload (bypasses the 4.5 MB serverless limit)
      // In local dev (no BLOB_READ_WRITE_TOKEN): fall back to FormData POST
      if (process.env.NEXT_PUBLIC_VERCEL_ENV) {
        const blob = await upload(pathname, file, {
          access: 'public',
          handleUploadUrl: `/api/persons/${person.id}/avatar`,
        });
        setPhotoUrl(blob.url);
        // Cache-busting so the browser doesn't show the old cached image (same URL)
        setDisplayPhotoUrl(blob.url + '?t=' + Date.now());
      } else {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch(`/api/persons/${person.id}/avatar`, { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) { setAvatarError(data.error || 'Erreur upload'); return; }
        setPhotoUrl(data.photoUrl);
        setDisplayPhotoUrl(data.photoUrl + '?t=' + Date.now());
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setAvatarError('Erreur : ' + msg);
    } finally {
      setAvatarUploading(false);
    }
  };

  // Place fields with geocoords
  const [birthPlace, setBirthPlace] = useState(person.birthPlaceFull || person.birthPlace || '');
  const [birthCoords, setBirthCoords] = useState<{ lat: number | null; lon: number | null }>({ lat: null, lon: null });
  const [deathPlace, setDeathPlace] = useState(person.deathPlaceFull || person.deathPlace || '');
  const [deathCoords, setDeathCoords] = useState<{ lat: number | null; lon: number | null }>({ lat: null, lon: null });
  const [burialPlace, setBurialPlace] = useState(person.burialPlace || '');

  const [events, setEvents] = useState<EventRow[]>(
    person.events.map(e => ({
      type: e.type,
      dateRaw: e.dateRaw || '',
      place: e.place || '',
      note: e.note || '',
      lat: e.lat ?? null,
      lon: e.lon ?? null,
    }))
  );

  const updateEvent = (i: number, field: keyof EventRow, value: string | number | null) =>
    setEvents(ev => ev.map((e, idx) => idx === i ? { ...e, [field]: value } : e));

  const updateEventPlace = (i: number, place: string, lat: number | null, lon: number | null) =>
    setEvents(ev => ev.map((e, idx) => idx === i ? { ...e, place, lat, lon } : e));

  const removeEvent = (i: number) =>
    setEvents(ev => ev.filter((_, idx) => idx !== i));

  const addEvent = () =>
    setEvents(ev => [...ev, { type: '', dateRaw: '', place: '', note: '' }]);

  return (
    <form action={action} className="space-y-5">
      {/* Hidden fields */}
      <input type="hidden" name="events" value={JSON.stringify(events)} />
      <input type="hidden" name="photoUrl" value={photoUrl} />
      <input type="hidden" name="birthPlace" value={birthPlace} />
      {birthCoords.lat != null && <input type="hidden" name="birthLat" value={birthCoords.lat} />}
      {birthCoords.lon != null && <input type="hidden" name="birthLon" value={birthCoords.lon} />}
      <input type="hidden" name="deathPlace" value={deathPlace} />
      {deathCoords.lat != null && <input type="hidden" name="deathLat" value={deathCoords.lat} />}
      {deathCoords.lon != null && <input type="hidden" name="deathLon" value={deathCoords.lon} />}
      <input type="hidden" name="burialPlace" value={burialPlace} />

      {/* Photo de profil */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">Photo de profil</h3>
        <div className="flex items-center gap-5">
          <span className="relative shrink-0 w-20 h-20 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
            {displayPhotoUrl ? (
              <Image key={displayPhotoUrl} src={displayPhotoUrl} alt={person.displayName} fill className="object-cover" unoptimized />
            ) : (
              <span className="flex items-center justify-center w-full h-full">
                <Monogram name={person.displayName} sex={person.sex} size="lg" />
              </span>
            )}
            {avatarUploading && (
              <span className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              </span>
            )}
          </span>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              className="px-4 py-2 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {photoUrl ? 'Changer la photo' : 'Choisir une photo'}
            </button>
            {photoUrl && (
              <button
                type="button"
                onClick={() => setPhotoUrl('')}
                className="block text-xs text-red-500 hover:text-red-400 transition-colors"
              >
                Supprimer la photo
              </button>
            )}
            <p className="text-xs text-slate-400">JPG, PNG, WebP, HEIC · Max 10 Mo</p>
            {avatarError && <p className="text-xs text-red-500">{avatarError}</p>}
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
      </div>

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
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Lieu</label>
          <PlaceAutocomplete
            value={birthPlace}
            onChange={(place, lat, lon) => { setBirthPlace(place); setBirthCoords({ lat, lon }); }}
            placeholder="ex: Paris, Lyon…"
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
        <Field label="Date de baptême" name="chrDateRaw" defaultValue={person.chrDateRaw} placeholder="ex: 20 JAN 1850" />
        <Field label="Lieu de baptême" name="chrPlace" defaultValue={person.chrPlace} />
      </Section>

      <Section title="Décès & Inhumation">
        <Field label="Date de décès" name="deathDateRaw" defaultValue={person.deathDateRaw} placeholder="ex: 3 MAR 1920" />
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Lieu de décès</label>
          <PlaceAutocomplete
            value={deathPlace}
            onChange={(place, lat, lon) => { setDeathPlace(place); setDeathCoords({ lat, lon }); }}
            placeholder="ex: Paris, Lyon…"
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
        <Field label="Date d'inhumation" name="burialDateRaw" defaultValue={person.burialDateRaw} />
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Lieu d&apos;inhumation</label>
          <PlaceAutocomplete
            value={burialPlace}
            onChange={(place) => setBurialPlace(place)}
            placeholder="ex: Cimetière du Père-Lachaise…"
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
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
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Lieu
                    {evt.lat != null && (
                      <span className="ml-1.5 text-green-600" title="Coordonnées géolocalisées">
                        <svg className="inline w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                  </label>
                  <PlaceAutocomplete
                    value={evt.place}
                    onChange={(place, lat, lon) => updateEventPlace(i, place, lat, lon)}
                    placeholder="ex: Paris, Lyon…"
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
