import { createHash } from 'node:crypto';
import type { PersonRecord } from './gedcom-store';

export function narrativeFacts(person: PersonRecord) {
  const deceased = Boolean(person.deathDateRaw || person.deathYear);
  return {
    displayName: person.displayName,
    birth: deceased ? { date: person.birthDateRaw, place: person.birthPlaceFull || person.birthPlace } : undefined,
    death: deceased ? { date: person.deathDateRaw, place: person.deathPlaceFull || person.deathPlace } : undefined,
    occupations: deceased ? person.occupations : [],
  };
}
export function narrativeFingerprint(person: PersonRecord, sources: unknown) {
  return createHash('sha256').update(JSON.stringify({ person, sources })).digest('hex');
}
