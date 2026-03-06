'use server';

import { savePersonEdit, type PersonEdit } from '@/lib/overrides-store';
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
    notes:          get('notes'),
  };

  // Remove undefined keys
  for (const key of Object.keys(edit) as (keyof PersonEdit)[]) {
    if (edit[key] === undefined) delete edit[key];
  }

  savePersonEdit(id, edit);
  clearStore(); // Force store re-init on next request

  redirect(`/person/${id}`);
}
