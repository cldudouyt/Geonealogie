import type { PersonRecord } from './gedcom-store';
import { MERGE_FIELDS, type MergeField } from './merge-fields';

export const normalizeName = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
export const pairKey = (a: string, b: string) => JSON.stringify([a, b].sort());
export interface DuplicateCandidate { a: PersonRecord; b: PersonRecord; confidence: 'certain' | 'probable' | 'possible'; reasons: string[]; eligible: boolean; blockers: string[] }
export interface Kinship { parents: string[]; spouses: string[]; children: string[] }
const sameSet = (a: string[], b: string[]) => JSON.stringify([...new Set(a)].sort()) === JSON.stringify([...new Set(b)].sort());
const present = (v: unknown) => v !== undefined && v !== null && v !== '';
function exactDate(raw?: string) {
  const m = raw?.trim().toUpperCase().match(/^(\d{1,2}) (JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC) (\d{4})$/);
  if (!m) return null;
  const month = 'JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC'.split(' ').indexOf(m[2]);
  const date = new Date(0); date.setUTCFullYear(Number(m[3]), month, Number(m[1]));
  return date.getUTCMonth() === month && date.getUTCDate() === Number(m[1]) ? `${m[3]}-${month}-${Number(m[1])}` : null;
}
export function analyzeDuplicates(persons: PersonRecord[], kin: Record<string, Kinship>, ignored: string[] = []) {
  const groups = new Map<string, PersonRecord[]>();
  for (const p of persons) {
    const surname = normalizeName(p.surname), first = normalizeName(p.givenNames).split(' ')[0];
    if (!surname || !first) continue;
    const key = `${surname}|${first}`;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  const pairs: DuplicateCandidate[] = []; let ignoredCount = 0;
  for (const group of groups.values()) for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) {
    const [a, b] = [group[i], group[j]].sort((x,y) => x.id.localeCompare(y.id));
    if (a.sex !== 'U' && b.sex !== 'U' && a.sex !== b.sex) continue;
    if (ignored.includes([a.id,b.id].sort().join(':'))) { ignoredCount++; continue; }
    const blockers: string[] = [], reasons = ['Même nom et premier prénom'];
    const birth = exactDate(a.birthDateRaw);
    if (!birth || birth !== exactDate(b.birthDateRaw)) blockers.push('Date de naissance précise absente ou différente');
    else reasons.push('Même date de naissance complète');
    if (normalizeName(a.givenNames) !== normalizeName(b.givenNames)) blockers.push('Prénoms complets différents');
    const placeA = a.birthPlaceFull || a.birthPlace, placeB = b.birthPlaceFull || b.birthPlace;
    if (!placeA || !placeB || normalizeName(placeA) !== normalizeName(placeB)) blockers.push('Lieu de naissance absent ou différent');
    else reasons.push('Même lieu de naissance');
    const ka = kin[a.id], kb = kin[b.id];
    if (!ka || !kb || new Set(ka.parents).size !== 2 || !sameSet(ka.parents, kb.parents)) blockers.push('Deux parents communs non confirmés');
    else reasons.push('Deux mêmes parents identifiés');
    if (!ka || !kb || !sameSet(ka.spouses,kb.spouses) || !sameSet(ka.children,kb.children)) blockers.push('Relations familiales différentes ou incomplètes');
    if (ka && kb && [...ka.parents,...ka.spouses,...ka.children,...kb.parents,...kb.spouses,...kb.children].some(id => id === a.id || id === b.id)) blockers.push('Les fiches sont apparentées directement');
    for (const key of Object.keys(MERGE_FIELDS) as MergeField[]) {
      if (key === 'notes') continue;
      const av = a[key], bv = b[key];
      if (present(av) && present(bv) && (['givenNames','surname','birthPlace','birthPlaceFull'].includes(key) && typeof av === 'string' && typeof bv === 'string' ? normalizeName(av) !== normalizeName(bv) : av !== bv)) blockers.push(`Information différente : ${MERGE_FIELDS[key]}`);
    }
    if (!sameSet(a.adoptiveParentIds,b.adoptiveParentIds) || !sameSet(a.adoptedChildIds,b.adoptedChildIds) || a.adoptionNote !== b.adoptionNote || !sameSet(a.occupations,b.occupations) || !sameSet(a.marriedSurnames,b.marriedSurnames)) blockers.push('Informations complémentaires différentes');
    const eligible = blockers.length === 0;
    pairs.push({ a,b,eligible,blockers,reasons,confidence: eligible ? 'certain' : a.birthYear && a.birthYear === b.birthYear ? 'probable' : 'possible' });
  }
  // Never choose arbitrarily between three or more matching records.
  const counts = new Map<string, number>();
  for (const p of pairs.filter(p => p.eligible)) for (const id of [p.a.id,p.b.id]) counts.set(id,(counts.get(id) ?? 0)+1);
  for (const p of pairs) if (p.eligible && [p.a.id,p.b.id].some(id => counts.get(id)! > 1)) { p.eligible = false; p.confidence = 'probable'; p.blockers.push('Plusieurs correspondances : comparaison individuelle nécessaire'); }
  const order = {certain:0,probable:1,possible:2};
  return { pairs: pairs.sort((a,b) => order[a.confidence]-order[b.confidence]), ignoredCount };
}
