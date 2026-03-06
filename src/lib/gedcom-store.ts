/**
 * In-memory GEDCOM data store — no Neo4j needed.
 * Parses the GEDCOM file once at startup and caches all data.
 */
import fs from 'fs';
import path from 'path';
import { readGedcom } from 'read-gedcom';
import { cleanRtf } from './gedcom/rtf-cleaner';
import { normalizeDate, extractYear } from './gedcom/date-normalizer';

export interface LifeEvent {
  type: string;
  dateRaw?: string;
  place?: string;
  placeFull?: string;
  note?: string;
}

export interface PersonRecord {
  id: string;
  givenNames: string;
  surname: string;
  displayName: string;
  nickname?: string;
  sex: 'M' | 'F' | 'U';
  birthDate?: string;
  birthDateRaw?: string;
  birthYear?: string;
  birthPlace?: string;
  birthPlaceFull?: string;
  birthLat?: number;
  birthLon?: number;
  chrDateRaw?: string;
  chrPlace?: string;
  deathDate?: string;
  deathDateRaw?: string;
  deathYear?: string;
  deathPlace?: string;
  deathPlaceFull?: string;
  deathLat?: number;
  deathLon?: number;
  burialDateRaw?: string;
  burialPlace?: string;
  occupation?: string;
  occupations: string[];
  nationality?: string;
  isAdopted: boolean;
  events: LifeEvent[];
  notes?: string;
}

export interface FamilyRecord {
  id: string;
  husbandId?: string;
  wifeId?: string;
  childrenIds: string[];
  marriageDate?: string;
  marriageDateRaw?: string;
  marriagePlace?: string;
  divorceDate?: string;
  divorceDateRaw?: string;
}

interface SpouseRelEntry {
  spouseId: string;
  familyId: string;
  marriageDate?: string;
  marriageDateRaw?: string;
  marriagePlace?: string;
  divorceDate?: string;
  divorceDateRaw?: string;
}

interface GedcomStore {
  persons: Map<string, PersonRecord>;
  families: Map<string, FamilyRecord>;
  childToParents: Map<string, string[]>;
  parentToChildren: Map<string, string[]>;
  spouseRelations: Map<string, SpouseRelEntry[]>;
}

let store: GedcomStore | null = null;

function stripXref(pointer: string | undefined): string {
  if (!pointer) return '';
  return pointer.replace(/@/g, '');
}

function getVal(node: any): string | undefined {
  try {
    const v = node?.value();
    if (Array.isArray(v)) return v[0]?.toString() || undefined;
    return v?.toString() || undefined;
  } catch { return undefined; }
}

function getAllVals(node: any): string[] {
  try {
    const nodes = node?.arraySelect() || [];
    if (nodes.length === 0) {
      const v = getVal(node);
      return v ? [v] : [];
    }
    return nodes.map((n: any) => getVal(n)).filter(Boolean) as string[];
  } catch { return []; }
}

function parsePlace(placeStr: string | undefined) {
  if (!placeStr) return null;
  const parts = placeStr.split(',').map((s: string) => s.trim());
  return {
    name: parts[0] || '',
    county: parts[2] || undefined,
    country: parts[4] || undefined,
  };
}

function parseCoord(str: string | undefined): number | undefined {
  if (!str) return undefined;
  const dir = str.charAt(0);
  const val = parseFloat(str.substring(1));
  if (isNaN(val)) return undefined;
  return val * (dir === 'S' || dir === 'W' ? -1 : 1);
}

export function getStore(): GedcomStore {
  if (store) return store;

  const gedcomPath = path.resolve(process.cwd(), 'Dudouyt Heredis 2014-Export.ged');
  const fileBuffer = fs.readFileSync(gedcomPath);
  const arrayBuffer = fileBuffer.buffer.slice(
    fileBuffer.byteOffset,
    fileBuffer.byteOffset + fileBuffer.byteLength
  ) as ArrayBuffer;
  const gedcom = readGedcom(arrayBuffer);

  const persons = new Map<string, PersonRecord>();
  const families = new Map<string, FamilyRecord>();
  const childToParents = new Map<string, string[]>();
  const parentToChildren = new Map<string, string[]>();
  const spouseRelations = new Map<string, SpouseRelEntry[]>();

  // Parse individuals
  const individuals = gedcom.getIndividualRecord().arraySelect();
  for (const indi of individuals) {
    const id = stripXref(indi.pointer()[0] as string | undefined);
    if (!id) continue;

    const nameTag = indi.getName();
    const givenNames = getVal(nameTag?.getGivenName()) || '';
    const surname = getVal(nameTag?.getSurname()) || '';
    const displayName = `${givenNames.split(',')[0].trim()} ${surname}`.trim();
    const nickname = getVal(indi.get('NAME')?.get('NICK'));

    const sexVal = getVal(indi.getSex());
    const sex = sexVal === 'M' ? 'M' : sexVal === 'F' ? 'F' : 'U';

    // Birth
    const birth = indi.getEventBirth();
    const birthDateRaw = getVal(birth?.getDate());
    const birthDate = normalizeDate(birthDateRaw);
    const birthYear = extractYear(birthDateRaw);
    const birthPlaceFull = getVal(birth?.getPlace()) || undefined;
    const birthParsed = parsePlace(birthPlaceFull);
    const birthPlace = birthParsed?.name || undefined;

    let birthLat: number | undefined, birthLon: number | undefined;
    try {
      const map = birth?.getPlace()?.get('MAP');
      birthLat = parseCoord(getVal(map?.get('LATI')));
      birthLon = parseCoord(getVal(map?.get('LONG')));
    } catch {}

    // Christening
    const chr = indi.get('CHR');
    const chrDateRaw = getVal(chr?.get('DATE')) || undefined;
    const chrPlaceFull = getVal(chr?.get('PLAC')) || undefined;
    const chrPlace = parsePlace(chrPlaceFull)?.name || undefined;

    // Death
    const death = indi.getEventDeath();
    const deathDateRaw = getVal(death?.getDate());
    const deathDate = normalizeDate(deathDateRaw);
    const deathYear = extractYear(deathDateRaw);
    const deathPlaceFull = getVal(death?.getPlace()) || undefined;
    const deathParsed = parsePlace(deathPlaceFull);
    const deathPlace = deathParsed?.name || undefined;

    let deathLat: number | undefined, deathLon: number | undefined;
    try {
      const dmap = death?.getPlace()?.get('MAP');
      deathLat = parseCoord(getVal(dmap?.get('LATI')));
      deathLon = parseCoord(getVal(dmap?.get('LONG')));
    } catch {}

    // Burial
    const buri = indi.get('BURI');
    const burialDateRaw = getVal(buri?.get('DATE')) || undefined;
    const burialPlaceFull = getVal(buri?.get('PLAC')) || undefined;
    const burialPlace = parsePlace(burialPlaceFull)?.name || undefined;

    // Occupations
    const occuNodes = indi.get('OCCU')?.arraySelect() || [];
    const occupations: string[] = [];
    for (const occ of occuNodes) {
      const v = getVal(occ);
      if (v) occupations.push(v);
    }

    const filVal = getVal(indi.get('_FIL'));
    const isAdopted = filVal === 'ADOPTED_CHILD';

    const natVal = getVal(indi.get('NATI')?.get('CAUS'));

    // Custom events (EVEN)
    const events: LifeEvent[] = [];
    for (const evt of (indi.get('EVEN')?.arraySelect() || [])) {
      // When Heredis exports 2 TYPE lines, the last is the human-readable description
      const types = getAllVals(evt.get('TYPE'));
      const type = types[types.length - 1] || types[0];
      if (!type) continue;

      const evtDateRaw = getVal(evt.get('DATE')) || undefined;
      const evtPlaceFull = getVal(evt.get('PLAC')) || undefined;
      const evtPlace = parsePlace(evtPlaceFull)?.name || undefined;
      const rawNote = evt.get('NOTE')?.value()?.toString() || '';
      const evtNote = cleanRtf(rawNote) || undefined;

      events.push({ type, dateRaw: evtDateRaw, place: evtPlace, placeFull: evtPlaceFull || undefined, note: evtNote });
    }

    // Notes (main notes + occupation notes; EVEN notes are already in events)
    let notes = '';
    const addNote = (n: string) => { if (n) notes += (notes ? '\n\n' : '') + cleanRtf(n); };
    for (const n of (indi.get('NOTE')?.arraySelect() || [])) {
      addNote(n.value()?.toString() || '');
    }
    for (const occ of occuNodes) {
      addNote(occ.get('NOTE')?.value()?.toString() || '');
    }

    persons.set(id, {
      id, givenNames, surname, displayName, nickname,
      sex, birthDate, birthDateRaw, birthYear,
      birthPlace, birthPlaceFull, birthLat, birthLon,
      chrDateRaw, chrPlace,
      deathDate, deathDateRaw, deathYear,
      deathPlace, deathPlaceFull, deathLat, deathLon,
      burialDateRaw, burialPlace,
      occupation: occupations[0],
      occupations,
      nationality: natVal,
      isAdopted,
      events,
      notes: notes || undefined,
    });
  }

  // Parse families
  const fams = gedcom.getFamilyRecord().arraySelect();
  for (const fam of fams) {
    const famId = stripXref(fam.pointer()[0] as string | undefined);
    if (!famId) continue;

    const husbId = stripXref(getVal(fam.getHusband())) || undefined;
    const wifeId = stripXref(getVal(fam.getWife())) || undefined;

    const marr = fam.get('MARR');
    const marriageDateRaw = getVal(marr?.get('DATE'));
    const marriageDate = normalizeDate(marriageDateRaw);
    const marriagePlaceFull = getVal(marr?.get('PLAC'));
    const marriageParsed = parsePlace(marriagePlaceFull);
    const marriagePlace = marriageParsed ?
      `${marriageParsed.name}${marriageParsed.county ? ', ' + marriageParsed.county : ''}` :
      undefined;

    const div = fam.get('DIV');
    const divorceDateRaw = getVal(div?.get('DATE')) || undefined;
    const divorceDate = normalizeDate(divorceDateRaw);

    const childrenIds: string[] = [];
    for (const childNode of (fam.getChild()?.arraySelect() || [])) {
      const childId = stripXref(getVal(childNode));
      if (childId) childrenIds.push(childId);
    }

    families.set(famId, {
      id: famId, husbandId: husbId, wifeId, childrenIds,
      marriageDate, marriageDateRaw, marriagePlace,
      divorceDate, divorceDateRaw,
    });

    // Build relationships
    if (husbId && wifeId) {
      const entry: SpouseRelEntry = { spouseId: wifeId, familyId: famId, marriageDate, marriageDateRaw, marriagePlace, divorceDate, divorceDateRaw };
      const h = spouseRelations.get(husbId) || [];
      h.push(entry);
      spouseRelations.set(husbId, h);

      const entry2: SpouseRelEntry = { spouseId: husbId, familyId: famId, marriageDate, marriageDateRaw, marriagePlace, divorceDate, divorceDateRaw };
      const w = spouseRelations.get(wifeId) || [];
      w.push(entry2);
      spouseRelations.set(wifeId, w);
    }

    for (const childId of childrenIds) {
      const parents = childToParents.get(childId) || [];
      if (husbId && !parents.includes(husbId)) parents.push(husbId);
      if (wifeId && !parents.includes(wifeId)) parents.push(wifeId);
      childToParents.set(childId, parents);

      for (const parentId of [husbId, wifeId].filter(Boolean) as string[]) {
        const children = parentToChildren.get(parentId) || [];
        if (!children.includes(childId)) children.push(childId);
        parentToChildren.set(parentId, children);
      }
    }
  }

  store = { persons, families, childToParents, parentToChildren, spouseRelations };
  console.log(`[GedcomStore] Loaded ${persons.size} persons, ${families.size} families`);
  return store;
}

// Expose helpers
export function getPerson(id: string): PersonRecord | undefined {
  return getStore().persons.get(id);
}

export function getAllPersons(): PersonRecord[] {
  return Array.from(getStore().persons.values());
}

export function getParents(id: string): PersonRecord[] {
  const s = getStore();
  return (s.childToParents.get(id) || [])
    .map(pid => s.persons.get(pid))
    .filter(Boolean) as PersonRecord[];
}

export function getChildren(id: string): PersonRecord[] {
  const s = getStore();
  return (s.parentToChildren.get(id) || [])
    .map(cid => s.persons.get(cid))
    .filter(Boolean) as PersonRecord[];
}

export function getSpouses(id: string) {
  const s = getStore();
  return (s.spouseRelations.get(id) || []).map(rel => ({
    person: s.persons.get(rel.spouseId),
    familyId: rel.familyId,
    marriageDate: rel.marriageDate,
    marriageDateRaw: rel.marriageDateRaw,
    marriagePlace: rel.marriagePlace,
    divorceDate: rel.divorceDate,
    divorceDateRaw: rel.divorceDateRaw,
  })).filter(s => s.person);
}

export function getSiblings(id: string): PersonRecord[] {
  const s = getStore();
  const parents = s.childToParents.get(id) || [];
  const siblingSet = new Set<string>();
  for (const parentId of parents) {
    for (const childId of (s.parentToChildren.get(parentId) || [])) {
      if (childId !== id) siblingSet.add(childId);
    }
  }
  return Array.from(siblingSet)
    .map(sid => s.persons.get(sid))
    .filter(Boolean) as PersonRecord[];
}

export function getTreeCentered(rootId: string): { rootId: string; nodes: any[]; links: any[] } {
  const s = getStore();
  const nodeIds = new Set<string>();
  const directLineIds = new Set<string>();

  function addDirectAncestors(id: string, depth: number) {
    if (depth < 0 || directLineIds.has(id)) return;
    directLineIds.add(id);
    nodeIds.add(id);
    for (const pid of (s.childToParents.get(id) || [])) {
      addDirectAncestors(pid, depth - 1);
    }
  }

  const descendantIds = new Set<string>();

  function addDescendants(id: string, depth: number) {
    if (depth <= 0) return;
    descendantIds.add(id);
    nodeIds.add(id);
    for (const cid of (s.parentToChildren.get(id) || [])) {
      if (!nodeIds.has(cid)) addDescendants(cid, depth - 1);
    }
  }

  addDirectAncestors(rootId, 6);
  addDescendants(rootId, 3);

  for (const id of directLineIds) {
    if (id === rootId) {
      for (const rel of (s.spouseRelations.get(id) || [])) nodeIds.add(rel.spouseId);
    } else {
      const directLineChildren = (s.parentToChildren.get(id) || []).filter(cid => directLineIds.has(cid));
      for (const child of directLineChildren) {
        for (const coParentId of (s.childToParents.get(child) || [])) {
          if (coParentId !== id) nodeIds.add(coParentId);
        }
      }
    }
  }

  for (const id of descendantIds) {
    if (id === rootId) continue;
    for (const rel of (s.spouseRelations.get(id) || [])) nodeIds.add(rel.spouseId);
  }

  const nodes = Array.from(nodeIds)
    .map(id => s.persons.get(id))
    .filter(Boolean)
    .map((p: any) => ({
      id: p.id,
      displayName: p.displayName,
      sex: p.sex,
      birthYear: p.birthYear,
      deathYear: p.deathYear,
      occupation: p.occupation,
    }));

  const links: any[] = [];
  const linkSet = new Set<string>();

  const addLink = (source: string, target: string, type: string) => {
    const key = `${source}-${target}-${type}`;
    const rkey = `${target}-${source}-${type}`;
    if (!linkSet.has(key) && !linkSet.has(rkey)) {
      linkSet.add(key);
      links.push({ source, target, type });
    }
  };

  for (const id of nodeIds) {
    for (const parentId of (s.childToParents.get(id) || [])) {
      if (nodeIds.has(parentId)) addLink(parentId, id, 'parent');
    }
    for (const rel of (s.spouseRelations.get(id) || [])) {
      if (nodeIds.has(rel.spouseId)) addLink(id, rel.spouseId, 'spouse');
    }
  }

  return { rootId, nodes, links };
}

export function searchPersons(query: string, limit = 20): PersonRecord[] {
  const q = query.toLowerCase();
  const results: Array<{ person: PersonRecord; score: number }> = [];

  for (const p of getStore().persons.values()) {
    let score = 0;
    const name = p.displayName.toLowerCase();
    const surname = p.surname.toLowerCase();

    if (surname.startsWith(q)) score = 3;
    else if (name.startsWith(q)) score = 2;
    else if (name.includes(q)) score = 1;
    else if (p.birthPlaceFull?.toLowerCase().includes(q)) score = 0.5;
    else if (p.occupation?.toLowerCase().includes(q)) score = 0.5;
    else continue;

    results.push({ person: p, score });
  }

  return results
    .sort((a, b) => b.score - a.score || a.person.surname.localeCompare(b.person.surname))
    .slice(0, limit)
    .map(r => r.person);
}
