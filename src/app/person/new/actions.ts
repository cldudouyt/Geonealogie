'use server';

import { addNewPerson, type NewPerson, type PersonRelation } from '@/lib/overrides-store';
import { clearStore } from '@/lib/gedcom-store';
import { geocodePlaces } from '@/lib/geocoder';

export interface NewPersonState {
  error?: string;
  success?: boolean;
  personId?: string;
}

const MONTH_MAP: Record<string, string> = {
  '01': 'JAN', '02': 'FEB', '03': 'MAR', '04': 'APR',
  '05': 'MAY', '06': 'JUN', '07': 'JUL', '08': 'AUG',
  '09': 'SEP', '10': 'OCT', '11': 'NOV', '12': 'DEC',
};

function normalizeDateRaw(input: string | undefined): string | undefined {
  if (!input) return undefined;
  const s = input.trim();
  if (!s) return undefined;

  // Already GEDCOM-ish: DD MON YYYY / MON YYYY / YYYY
  if (/^(\d{1,2}\s+)?[A-Za-z]{3}(\s+\d{4})?$/.test(s) || /^\d{4}$/.test(s)) {
    return s.toUpperCase();
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/);
  if (dmy) {
    const mon = MONTH_MAP[dmy[2].padStart(2, '0')];
    return mon ? `${parseInt(dmy[1])} ${mon} ${dmy[3]}` : s;
  }

  // YYYY-MM-DD (ISO)
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const mon = MONTH_MAP[iso[2]];
    return mon ? `${parseInt(iso[3])} ${mon} ${iso[1]}` : s;
  }

  return s;
}

export async function createPerson(
  _prev: NewPersonState | null,
  formData: FormData,
): Promise<NewPersonState> {
  const get = (k: string) => formData.get(k)?.toString().trim() || undefined;

  const givenNames = get('givenNames');
  const surname    = get('surname');
  const sexRaw = get('sex');
  const sex = (['M', 'F', 'U'] as const).find(v => v === sexRaw);

  if (!givenNames) return { error: 'Le prénom est obligatoire.' };
  if (!surname)    return { error: 'Le nom de famille est obligatoire.' };
  if (!sex)        return { error: 'Le sexe est obligatoire.' };

  const id = `custom-${Date.now()}`;

  // Parse multiple relations from formData (relations[0][relType], relations[0][relPersonId], …)
  const relations: PersonRelation[] = [];
  let i = 0;
  while (formData.has(`relations[${i}][relType]`)) {
    const relType = formData.get(`relations[${i}][relType]`)?.toString() as PersonRelation['relType'];
    const relPersonId = formData.get(`relations[${i}][relPersonId]`)?.toString() || '';
    if (relType && relPersonId) relations.push({ relType, relPersonId });
    i++;
  }

  const birthPlace  = get('birthPlace');
  const deathPlace  = get('deathPlace');
  const burialPlace = get('burialPlace');

  const person: NewPerson = {
    id,
    givenNames,
    surname,
    sex,
    nickname:      get('nickname'),
    birthDateRaw:  normalizeDateRaw(get('birthDateRaw')),
    birthPlace,
    birthPlaceFull: get('birthPlaceFull'),
    deathDateRaw:  normalizeDateRaw(get('deathDateRaw')),
    deathPlace,
    deathPlaceFull: get('deathPlaceFull'),
    burialDateRaw: normalizeDateRaw(get('burialDateRaw')),
    burialPlace,
    chrDateRaw:    normalizeDateRaw(get('chrDateRaw')),
    chrPlace:      get('chrPlace'),
    occupation:    get('occupation'),
    nationality:   get('nationality'),
    isAdopted:     formData.get('isAdopted') === 'yes',
    notes:         get('notes'),
    relations:     relations.length > 0 ? relations : undefined,
  };

  // Clean undefined / false isAdopted
  const p = person as unknown as Record<string, unknown>;
  for (const key of Object.keys(p)) {
    if (p[key] === undefined || p[key] === false) delete p[key];
  }

  await addNewPerson(person);

  // Geocode places in background (best-effort, non-blocking)
  const places = [birthPlace, deathPlace, burialPlace].filter(Boolean) as string[];
  if (places.length > 0) {
    geocodePlaces(places).catch(() => {});
  }

  clearStore();

  return { success: true, personId: id };
}
