import { readState, mutateState } from './state-store';
export interface EventOverride {
  type: string;
  dateRaw?: string;
  place?: string;
  note?: string;
  lat?: number | null;
  lon?: number | null;
}

export interface PersonEdit {
  givenNames?: string;
  surname?: string;
  nickname?: string;
  sex?: 'M' | 'F' | 'U';
  birthDateRaw?: string;
  birthPlace?: string;
  birthPlaceFull?: string;
  birthLat?: number | null;
  birthLon?: number | null;
  deathDateRaw?: string;
  deathPlace?: string;
  deathPlaceFull?: string;
  deathLat?: number | null;
  deathLon?: number | null;
  burialDateRaw?: string;
  burialPlace?: string;
  chrDateRaw?: string;
  chrPlace?: string;
  occupation?: string;
  nationality?: string;
  isAdopted?: boolean;
  notes?: string;
  events?: EventOverride[];
  photoUrl?: string;
  sources?: SourceEvidence[];
}

export interface PersonRelation {
  relType: 'child' | 'parent' | 'spouse';
  relPersonId: string;
}

export interface NewPerson extends PersonEdit {
  id: string;
  givenNames: string;
  surname: string;
  sex: 'M' | 'F' | 'U';
  /** Legacy single-relation (backward compat) */
  relType?: 'child' | 'parent' | 'spouse';
  relPersonId?: string;
  /** Multiple relations */
  relations?: PersonRelation[];
}

export interface SourceEvidence { id: string; event: string; reference: string; url?: string; documentId?: string; confidence: 'confirmed' | 'approximate' | 'unverified' }
export interface HistoryEntry { id: string; at: string; actor: string; label: string; personIds: string[]; before: Omit<Overrides, 'history'> }
export interface Overrides {
  revision?: number;
  personVersions?: Record<string, number>;
  updatedAt?: Record<string, string>;
  history?: HistoryEntry[];
  persons: Record<string, PersonEdit>;
  newPersons: NewPerson[];
  deletedPersonIds?: string[];
  /** deleteId → keepId */
  mergedPersons?: Record<string, string>;
  /** sorted "idA:idB" pairs to ignore in duplicate detection */
  ignoredDoublons?: string[];
}


const empty = (): Overrides => ({ persons: {}, newPersons: [], deletedPersonIds: [], mergedPersons: {}, ignoredDoublons: [], revision: 0, history: [] });
export async function loadOverrides(): Promise<Overrides> { return readState('overrides', empty()); }
export function clearOverridesCache(): void {}
export async function commitOverridesToGitHub(): Promise<void> {}
export async function changeOverrides<R>(actor: string, label: string, personIds: string[], change: (state: Overrides) => R): Promise<R> {
  return mutateState('overrides', empty(), state => {
    const before = structuredClone(state);
    delete before.history;
    const result = change(state);
    state.revision = (state.revision ?? 0) + 1;
    state.updatedAt ??= {}; state.personVersions ??= {};
    const at = new Date().toISOString();
    for (const id of personIds) { state.updatedAt[id] = at; state.personVersions[id] = (state.personVersions[id] ?? 0) + 1; }
    state.history ??= [];
    state.history.push({ id: crypto.randomUUID(), at, actor, label, personIds, before });
    return result;
  });
}
export async function savePersonEdit(id: string, edit: PersonEdit, actor = 'Application', expectedVersion?: number): Promise<void> {
  await changeOverrides(actor, 'Modification de fiche', [id], s => {
    if (expectedVersion !== undefined && (s.personVersions?.[id] ?? 0) !== expectedVersion) throw new Error('Cette fiche a changé depuis son ouverture. Rechargez-la avant de réessayer.');
    const custom = s.newPersons.find(p => p.id === id);
    if (custom) Object.assign(custom, edit);
    else s.persons[id] = { ...s.persons[id], ...edit };
  });
}
export async function addNewPerson(person: NewPerson, actor = 'Application'): Promise<void> {
  await changeOverrides(actor, 'Ajout de personne', [person.id], s => {
    if (s.newPersons.some(p => p.id === person.id)) throw new Error('Cette personne existe déjà.');
    s.newPersons.push(person);
  });
}
export async function deletePerson(id: string, actor = 'Application'): Promise<void> {
  await changeOverrides(actor, 'Suppression de personne', [id], s => { s.deletedPersonIds ??= []; if (!s.deletedPersonIds.includes(id)) s.deletedPersonIds.push(id); });
}
export async function mergePerson(keepId: string, deleteId: string, edit: PersonEdit = {}, actor = 'Application', expectedRevision?: number): Promise<void> {
  await changeOverrides(actor, 'Fusion de doublons', [keepId, deleteId], s => {
    if (keepId === deleteId || s.deletedPersonIds?.includes(keepId) || s.deletedPersonIds?.includes(deleteId)) throw new Error('Fusion impossible : rechargez les fiches.');
    if (expectedRevision !== undefined && (s.revision ?? 0) !== expectedRevision) throw new Error('Les données ont changé. Rechargez la comparaison.');
    const custom = s.newPersons.find(p => p.id === keepId);
    if (custom) Object.assign(custom, edit); else s.persons[keepId] = { ...s.persons[keepId], ...edit };
    s.mergedPersons ??= {}; s.mergedPersons[deleteId] = keepId;
    s.deletedPersonIds ??= []; s.deletedPersonIds.push(deleteId);
  });
}
export async function ignoreDoublon(idA: string, idB: string, actor = 'Application'): Promise<void> {
  await changeOverrides(actor, 'Doublon écarté', [idA, idB], s => { s.ignoredDoublons ??= []; const key = [idA,idB].sort().join(':'); if (!s.ignoredDoublons.includes(key)) s.ignoredDoublons.push(key); });
}
export async function restoreLatest(entryId: string, actor: string): Promise<void> {
  const affected: string[] = [];
  await changeOverrides(actor, 'Restauration de la dernière modification', affected, s => {
    const last = s.history?.at(-1);
    if (!last || last.id !== entryId) throw new Error('Une modification plus récente existe. Rechargez l’historique.');
    affected.push(...last.personIds);
    const versions = { ...s.personVersions };
    const revision = s.revision;
    Object.assign(s, structuredClone(last.before));
    s.revision = revision;
    s.personVersions = versions;

  });
}
