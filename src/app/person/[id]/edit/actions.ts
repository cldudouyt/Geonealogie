'use server';

import { savePersonEdit, type PersonEdit, type EventOverride } from '@/lib/overrides-store';
import { clearStore } from '@/lib/gedcom-store';
import { redirect } from 'next/navigation';

export interface EditState {
  error?: string;
  success?: boolean;
}

export async function saveEdit(
  id: string,
  _prev: EditState | null,
  formData: FormData,
): Promise<EditState> {
  const get = (k: string) => formData.get(k)?.toString().trim() || undefined;

  const isAdoptedRaw = formData.get('isAdopted')?.toString();

  let events: EventOverride[] | undefined;
  const eventsJson = formData.get('events')?.toString();
  if (eventsJson) {
    try {
      const parsed = JSON.parse(eventsJson) as EventOverride[];
      events = parsed.filter(e => e.type?.trim());
    } catch { /* ignore malformed JSON */ }
  }

  const edit: PersonEdit = {
    givenNames:     get('givenNames'),
    surname:        get('surname'),
    nickname:       get('nickname'),
    sex:            (get('sex') as 'M' | 'F' | 'U') || undefined,
    birthDateRaw:   get('birthDateRaw'),
    birthPlace:     get('birthPlace'),
    deathDateRaw:   get('deathDateRaw'),
    deathPlace:     get('deathPlace'),
    burialDateRaw:  get('burialDateRaw'),
    burialPlace:    get('burialPlace'),
    chrDateRaw:     get('chrDateRaw'),
    chrPlace:       get('chrPlace'),
    occupation:     get('occupation'),
    nationality:    get('nationality'),
    isAdopted:      isAdoptedRaw !== undefined ? isAdoptedRaw === 'yes' : undefined,
    notes:          get('notes'),
    events,
    // photoUrl: empty string means "cleared", undefined means "field absent"
    photoUrl:       formData.has('photoUrl') ? (formData.get('photoUrl')?.toString().trim() || '') : undefined,
  };

  // Remove undefined keys
  for (const key of Object.keys(edit) as (keyof PersonEdit)[]) {
    if (edit[key] === undefined) delete edit[key];
  }

  await savePersonEdit(id, edit);
  clearStore();

  redirect(`/person/${id}`);
}
