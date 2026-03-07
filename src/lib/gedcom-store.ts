/**
 * In-memory GEDCOM data store — no Neo4j needed.
 * Parses the GEDCOM file once at startup and caches all data.
 */
import fs from 'fs';
import path from 'path';
import { readGedcom } from 'read-gedcom';
import { cleanRtf } from './gedcom/rtf-cleaner';
import { normalizeDate, extractYear } from './gedcom/date-normalizer';
import { loadOverrides, clearOverridesCache, type NewPerson } from './overrides-store';
import { applyGeoCache } from './geocoder';

export interface LifeEvent {
  type: string;
  dateRaw?: string;
  place?: string;
  placeFull?: string;
  lat?: number;
  lon?: number;
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
  adoptiveParentIds: string[]; // persons who legally adopted this person
  adoptedChildIds: string[];   // persons this person has adopted
  adoptionNote?: string;       // free-text note from EVEN TYPE Adopté (e.g. "Adoption simple par Jean DUDOUYT")
  events: LifeEvent[];
  notes?: string;
  photoUrl?: string;
  marriedSurnames: string[]; // reserved for explicit GEDCOM married-name records (none present in current file)
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

let storePromise: Promise<GedcomStore> | null = null;

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

async function buildStore(): Promise<GedcomStore> {

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


    const natVal = getVal(indi.get('NATI'));

    // Helper to extract a standard event node into a LifeEvent
    function parseStdEvent(node: any, label: string): LifeEvent | null {
      if (!node) return null;
      const dateRaw = getVal(node.get('DATE')) || undefined;
      const placeFull = getVal(node.get('PLAC')) || undefined;
      const place = parsePlace(placeFull)?.name || undefined;
      const rawNote = node.get('NOTE')?.value()?.toString() || '';
      const note = cleanRtf(rawNote) || undefined;
      let lat: number | undefined, lon: number | undefined;
      try {
        const map = node.get('PLAC')?.get('MAP');
        lat = parseCoord(getVal(map?.get('LATI')));
        lon = parseCoord(getVal(map?.get('LONG')));
      } catch {}
      if (!dateRaw && !place && !note) return null;
      return { type: label, dateRaw, place, placeFull, lat, lon, note };
    }

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

      let evtLat: number | undefined, evtLon: number | undefined;
      try {
        const evtMap = evt.get('PLAC')?.get('MAP');
        evtLat = parseCoord(getVal(evtMap?.get('LATI')));
        evtLon = parseCoord(getVal(evtMap?.get('LONG')));
      } catch {}

      events.push({ type, dateRaw: evtDateRaw, place: evtPlace, placeFull: evtPlaceFull || undefined, lat: evtLat, lon: evtLon, note: evtNote });
    }

    // Standard biographical events (GRAD, EDUC)
    const LABEL_MAP: Record<string, string> = {
      GRAD: 'Diplôme',
      EDUC: 'Éducation',
    };
    for (const tag of Object.keys(LABEL_MAP)) {
      for (const node of (indi.get(tag)?.arraySelect() || [])) {
        const evt = parseStdEvent(node, LABEL_MAP[tag]);
        if (evt) events.push(evt);
      }
    }

    // OCCU with date or note → timeline event (others stay as occupation label only)
    for (const occ of occuNodes) {
      const occName = getVal(occ);
      const occDateRaw = getVal(occ.get('DATE')) || undefined;
      const rawOccNote = occ.get('NOTE')?.value()?.toString() || '';
      const occNote = cleanRtf(rawOccNote) || undefined;
      if (occDateRaw || occNote) {
        const occPlaceFull = getVal(occ.get('PLAC')) || undefined;
        const occPlace = parsePlace(occPlaceFull)?.name || undefined;
        events.push({
          type: occName || 'Carrière',
          dateRaw: occDateRaw,
          place: occPlace,
          placeFull: occPlaceFull,
          lat: undefined,
          lon: undefined,
          note: occNote,
        });
      }
    }

    // Extract adoption note from EVEN with type containing "Adopt"
    let adoptionNote: string | undefined;
    if (isAdopted) {
      for (const evt of (indi.get('EVEN')?.arraySelect() || [])) {
        const types = getAllVals(evt.get('TYPE'));
        const type = (types[types.length - 1] || types[0] || '').toLowerCase();
        if (type.includes('adopt')) {
          const rawNote = evt.get('NOTE')?.value()?.toString() || '';
          const cleaned = cleanRtf(rawNote);
          if (cleaned) { adoptionNote = cleaned; break; }
        }
      }
    }

    // Notes: only top-level INDI NOTE tags (EVEN/GRAD/OCCU notes are in events)
    let notes = '';
    const addNote = (n: string) => { if (n) notes += (notes ? '\n\n' : '') + cleanRtf(n); };
    for (const n of (indi.get('NOTE')?.arraySelect() || [])) {
      addNote(n.value()?.toString() || '');
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
      adoptionNote,
      adoptiveParentIds: [],
      adoptedChildIds: [],
      events,
      notes: notes || undefined,
      marriedSurnames: [],
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


  // Resolve adoptive parent links from adoption notes (e.g. "Adoption simple par Jean DUDOUYT")
  for (const person of persons.values()) {
    if (!person.isAdopted || !person.adoptionNote) continue;
    // Extract name(s) after "par " on the first line of the note
    const match = person.adoptionNote.match(/par\s+(.+?)(?:\n|$)/i);
    if (!match) continue;
    const adopterName = normalize(match[1].trim());
    // Find matching person: surname must match and first given name must appear in adopter string
    for (const candidate of persons.values()) {
      const candidateSurname = normalize(candidate.surname);
      const candidateFirst = normalize(candidate.givenNames.split(',')[0].trim());
      if (adopterName.includes(candidateSurname) && adopterName.includes(candidateFirst)) {
        if (!person.adoptiveParentIds.includes(candidate.id)) {
          person.adoptiveParentIds.push(candidate.id);
        }
        if (!candidate.adoptedChildIds.includes(person.id)) {
          candidate.adoptedChildIds.push(person.id);
        }
      }
    }
  }

  const s: GedcomStore = { persons, families, childToParents, parentToChildren, spouseRelations };

  // Apply geocached coordinates for places that lack MAP/LATI/LONG in GEDCOM
  const placeNames: string[] = [];
  for (const p of persons.values()) {
    if (p.birthPlaceFull && p.birthLat == null) placeNames.push(p.birthPlaceFull);
    if (p.deathPlaceFull && p.deathLat == null) placeNames.push(p.deathPlaceFull);
  }
  const geoMap = applyGeoCache(placeNames);
  for (const p of persons.values()) {
    if (p.birthPlaceFull && p.birthLat == null) {
      const pt = geoMap.get(p.birthPlaceFull);
      if (pt) { p.birthLat = pt.lat; p.birthLon = pt.lon; }
    }
    if (p.deathPlaceFull && p.deathLat == null) {
      const pt = geoMap.get(p.deathPlaceFull);
      if (pt) { p.deathLat = pt.lat; p.deathLon = pt.lon; }
    }
  }

  // Apply manual overrides on top of GEDCOM data
  await applyOverrides(s);

  console.log(`[GedcomStore] Loaded ${persons.size} persons, ${families.size} families`);
  return s;
}

export function getStore(): Promise<GedcomStore> {
  if (!storePromise) {
    storePromise = buildStore();
  }
  return storePromise;
}

function newPersonToRecord(np: NewPerson): PersonRecord {
  const displayName = `${np.givenNames.split(',')[0].trim()} ${np.surname}`.trim();
  return {
    id: np.id,
    givenNames: np.givenNames,
    surname: np.surname,
    displayName,
    nickname: np.nickname,
    sex: np.sex,
    birthDateRaw: np.birthDateRaw,
    birthDate: np.birthDateRaw ? normalizeDate(np.birthDateRaw) : undefined,
    birthYear: np.birthDateRaw ? extractYear(np.birthDateRaw) : undefined,
    birthPlace: np.birthPlace,
    birthPlaceFull: np.birthPlaceFull,
    deathDateRaw: np.deathDateRaw,
    deathDate: np.deathDateRaw ? normalizeDate(np.deathDateRaw) : undefined,
    deathYear: np.deathDateRaw ? extractYear(np.deathDateRaw) : undefined,
    deathPlace: np.deathPlace,
    deathPlaceFull: np.deathPlaceFull,
    burialDateRaw: np.burialDateRaw,
    burialPlace: np.burialPlace,
    chrDateRaw: np.chrDateRaw,
    chrPlace: np.chrPlace,
    occupation: np.occupation,
    occupations: np.occupation ? [np.occupation] : [],
    nationality: np.nationality,
    isAdopted: np.isAdopted || false,
    adoptiveParentIds: [],
    adoptedChildIds: [],
    events: [],
    notes: np.notes,
    marriedSurnames: [],
  };
}

async function applyOverrides(s: GedcomStore): Promise<void> {
  const overrides = await loadOverrides();

  // Apply edits to existing persons
  for (const [id, edit] of Object.entries(overrides.persons)) {
    const person = s.persons.get(id);
    if (!person) continue;
    if (edit.givenNames  !== undefined) person.givenNames  = edit.givenNames;
    if (edit.surname     !== undefined) person.surname     = edit.surname;
    if (edit.nickname    !== undefined) person.nickname    = edit.nickname;
    if (edit.sex         !== undefined) person.sex         = edit.sex;
    if (edit.birthDateRaw  !== undefined) { person.birthDateRaw  = edit.birthDateRaw; person.birthDate  = normalizeDate(edit.birthDateRaw); person.birthYear  = extractYear(edit.birthDateRaw); }
    if (edit.birthPlace  !== undefined) person.birthPlace  = edit.birthPlace;
    if (edit.birthPlaceFull !== undefined) person.birthPlaceFull = edit.birthPlaceFull;
    if (edit.deathDateRaw  !== undefined) { person.deathDateRaw  = edit.deathDateRaw; person.deathDate  = normalizeDate(edit.deathDateRaw); person.deathYear  = extractYear(edit.deathDateRaw); }
    if (edit.deathPlace  !== undefined) person.deathPlace  = edit.deathPlace;
    if (edit.deathPlaceFull !== undefined) person.deathPlaceFull = edit.deathPlaceFull;
    if (edit.burialDateRaw !== undefined) person.burialDateRaw   = edit.burialDateRaw;
    if (edit.burialPlace !== undefined) person.burialPlace       = edit.burialPlace;
    if (edit.chrDateRaw  !== undefined) person.chrDateRaw        = edit.chrDateRaw;
    if (edit.chrPlace    !== undefined) person.chrPlace          = edit.chrPlace;
    if (edit.occupation  !== undefined) { person.occupation = edit.occupation; if (!person.occupations.includes(edit.occupation)) person.occupations = [edit.occupation, ...person.occupations]; }
    if (edit.nationality !== undefined) person.nationality       = edit.nationality;
    if (edit.isAdopted   !== undefined) person.isAdopted         = edit.isAdopted;
    if (edit.notes       !== undefined) person.notes             = edit.notes;
    if (edit.events      !== undefined) person.events = edit.events.map(e => ({
      type: e.type, dateRaw: e.dateRaw, place: e.place, note: e.note,
    }));
    if (edit.photoUrl    !== undefined) person.photoUrl    = edit.photoUrl;
    // Recompute displayName
    person.displayName = `${person.givenNames.split(',')[0].trim()} ${person.surname}`.trim();
  }

  // Add new persons and wire up relationships
  for (const np of overrides.newPersons) {
    const record = newPersonToRecord(np);
    s.persons.set(np.id, record);

    if (np.relType === 'child' && np.relPersonId) {
      // np is a child of relPersonId
      s.childToParents.set(np.id, [np.relPersonId]);
      const arr = s.parentToChildren.get(np.relPersonId) || [];
      if (!arr.includes(np.id)) arr.push(np.id);
      s.parentToChildren.set(np.relPersonId, arr);
    } else if (np.relType === 'parent' && np.relPersonId) {
      // np is a parent of relPersonId
      const arr = s.childToParents.get(np.relPersonId) || [];
      if (!arr.includes(np.id)) arr.push(np.id);
      s.childToParents.set(np.relPersonId, arr);
      s.parentToChildren.set(np.id, [np.relPersonId]);
    } else if (np.relType === 'spouse' && np.relPersonId) {
      // Bidirectional spouse relation
      const fakeFamily = `FAM-custom-${np.id}`;
      const addSpouse = (personId: string, spouseId: string) => {
        const rels = s.spouseRelations.get(personId) || [];
        if (!rels.find(r => r.spouseId === spouseId)) {
          rels.push({ spouseId, familyId: fakeFamily });
        }
        s.spouseRelations.set(personId, rels);
      };
      addSpouse(np.id, np.relPersonId);
      addSpouse(np.relPersonId, np.id);
    }
  }
}

/** Call after saving overrides to force store re-initialization on next request */
export function clearStore(): void {
  storePromise = null;
  clearOverridesCache();
}

export async function getDefaultPersonId(): Promise<string> {
  const s = await getStore();
  let earliest: { id: string; year: number } | null = null;
  for (const p of s.persons.values()) {
    const year = p.birthYear ? parseInt(p.birthYear) : null;
    if (year && (!earliest || year < earliest.year)) {
      earliest = { id: p.id, year };
    }
  }
  return earliest?.id ?? (s.persons.keys().next().value as string) ?? '';
}

export async function getPerson(id: string): Promise<PersonRecord | undefined> {
  return (await getStore()).persons.get(id);
}

export async function getAllPersons(): Promise<PersonRecord[]> {
  return Array.from((await getStore()).persons.values());
}

export async function getParents(id: string): Promise<PersonRecord[]> {
  const s = await getStore();
  return (s.childToParents.get(id) || [])
    .map(pid => s.persons.get(pid))
    .filter(Boolean) as PersonRecord[];
}

export async function getChildren(id: string): Promise<PersonRecord[]> {
  const s = await getStore();
  return (s.parentToChildren.get(id) || [])
    .map(cid => s.persons.get(cid))
    .filter(Boolean) as PersonRecord[];
}

export async function getSpouses(id: string) {
  const s = await getStore();
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

export async function getSiblings(id: string): Promise<PersonRecord[]> {
  const s = await getStore();
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

export async function getTreeCentered(rootId: string): Promise<{ rootId: string; nodes: any[]; links: any[] }> {
  const s = await getStore();
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

  // Expand nodeIds to include adoptive persons connected to anyone already in the tree
  for (const id of [...nodeIds]) {
    const p = s.persons.get(id);
    if (!p) continue;
    for (const pid of p.adoptiveParentIds) nodeIds.add(pid);
    for (const cid of p.adoptedChildIds) nodeIds.add(cid);
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
      photoUrl: p.photoUrl,
      isAdopted: p.isAdopted,
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
    const person = s.persons.get(id);
    if (person) {
      for (const adoptiveParentId of person.adoptiveParentIds) {
        if (nodeIds.has(adoptiveParentId)) addLink(adoptiveParentId, id, 'adoption');
      }
    }
  }

  return { rootId, nodes, links };
}

export interface RelationStep {
  personId: string;
  displayName: string;
  relation: string; // how we got here from previous step
}

export async function findRelationshipPath(fromId: string, toId: string): Promise<RelationStep[] | null> {
  const s = await getStore();
  if (fromId === toId) return [];

  // BFS
  const queue: Array<{ id: string; path: RelationStep[] }> = [
    { id: fromId, path: [{ personId: fromId, displayName: s.persons.get(fromId)?.displayName ?? fromId, relation: 'départ' }] }
  ];
  const visited = new Set<string>([fromId]);

  while (queue.length > 0) {
    const { id, path } = queue.shift()!;

    const neighbors: Array<{ id: string; relation: string }> = [];

    // Parents
    for (const pid of (s.childToParents.get(id) || [])) {
      neighbors.push({ id: pid, relation: 'parent' });
    }
    // Children
    for (const cid of (s.parentToChildren.get(id) || [])) {
      neighbors.push({ id: cid, relation: 'enfant' });
    }
    // Spouses
    for (const rel of (s.spouseRelations.get(id) || [])) {
      neighbors.push({ id: rel.spouseId, relation: 'conjoint' });
    }

    for (const { id: nid, relation } of neighbors) {
      if (visited.has(nid)) continue;
      visited.add(nid);
      const p = s.persons.get(nid);
      if (!p) continue;
      const newPath = [...path, { personId: nid, displayName: p.displayName, relation }];
      if (nid === toId) return newPath;
      queue.push({ id: nid, path: newPath });
    }
  }
  return null; // no path found
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = i;
    for (let j = 1; j <= n; j++) {
      const val = a[i - 1] === b[j - 1] ? dp[j - 1] : Math.min(dp[j - 1], dp[j], prev) + 1;
      dp[j - 1] = prev;
      prev = val;
    }
    dp[n] = prev;
  }
  return dp[n];
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

export async function searchPersons(query: string, limit = 20): Promise<PersonRecord[]> {
  const q = normalize(query.trim());
  if (!q) return [];
  const results: Array<{ person: PersonRecord; score: number }> = [];

  for (const p of (await getStore()).persons.values()) {
    let score = 0;
    const name = normalize(p.displayName);
    const surname = normalize(p.surname);
    const given = normalize(p.givenNames);

    if (surname.startsWith(q)) score = 10;
    else if (name.startsWith(q)) score = 8;
    else if (surname.includes(q)) score = 6;
    else if (name.includes(q)) score = 5;
    else if (p.birthPlaceFull && normalize(p.birthPlaceFull).includes(q)) score = 3;
    else if (p.occupation && normalize(p.occupation).includes(q)) score = 3;
    else {
      // Fuzzy: try Levenshtein on surname and given name tokens
      const surnameDist = levenshtein(q, surname.substring(0, q.length + 2));
      const givenDist = levenshtein(q, given.substring(0, q.length + 2));
      const minDist = Math.min(surnameDist, givenDist);
      const tolerance = q.length <= 3 ? 0 : q.length <= 5 ? 1 : 2;
      if (minDist <= tolerance) score = Math.max(1, 3 - minDist);
      else continue;
    }

    results.push({ person: p, score });
  }

  return results
    .sort((a, b) => b.score - a.score || a.person.surname.localeCompare(b.person.surname))
    .slice(0, limit)
    .map(r => r.person);
}
