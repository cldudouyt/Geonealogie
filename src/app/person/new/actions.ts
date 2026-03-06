'use server';

import { addNewPerson, type NewPerson } from '@/lib/overrides-store';
import { clearStore } from '@/lib/gedcom-store';
import { redirect } from 'next/navigation';

export interface NewPersonState {
  error?: string;
}

export async function createPerson(
  _prev: NewPersonState | null,
  formData: FormData,
): Promise<NewPersonState> {
  const get = (k: string) => formData.get(k)?.toString().trim() || undefined;

  const givenNames = get('givenNames');
  const surname    = get('surname');
  const sex        = get('sex') as 'M' | 'F' | 'U' | undefined;

  if (!givenNames) return { error: 'Le prénom est obligatoire.' };
  if (!surname)    return { error: 'Le nom de famille est obligatoire.' };
  if (!sex)        return { error: 'Le sexe est obligatoire.' };

  const id = `custom-${Date.now()}`;

  const person: NewPerson = {
    id,
    givenNames,
    surname,
    sex,
    nickname:    get('nickname'),
    birthDateRaw: get('birthDateRaw'),
    birthPlace:  get('birthPlace'),
    deathDateRaw: get('deathDateRaw'),
    deathPlace:  get('deathPlace'),
    burialDateRaw: get('burialDateRaw'),
    burialPlace: get('burialPlace'),
    chrDateRaw:  get('chrDateRaw'),
    chrPlace:    get('chrPlace'),
    occupation:  get('occupation'),
    nationality: get('nationality'),
    notes:       get('notes'),
    relType:     get('relType') as NewPerson['relType'],
    relPersonId: get('relPersonId') || undefined,
  };

  // Clean undefined
  for (const key of Object.keys(person) as (keyof NewPerson)[]) {
    if ((person as Record<string, unknown>)[key] === undefined) delete (person as Record<string, unknown>)[key];
  }

  addNewPerson(person);
  clearStore();

  redirect(`/person/${id}`);
}
