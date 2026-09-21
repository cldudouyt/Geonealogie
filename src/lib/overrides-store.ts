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

export interface MergeOperation { keepId: string; deleteId: string; edit: PersonEdit }
export async function mergePersonBatch(operations: MergeOperation[], actor: string, expectedRevision: number): Promise<void> {
  if (!operations.length || operations.length > 50) throw new Error('Sélectionnez entre 1 et 50 paires.');
  const ids = operations.flatMap(p => [p.keepId, p.deleteId]);
  if (new Set(ids).size !== ids.length) throw new Error('Une fiche ne peut apparaître qu’une fois dans le lot.');
  await changeOverrides(actor, `Fusion en lot de ${operations.length} paires`, ids, s => {
    if ((s.revision ?? 0) !== expectedRevision) throw new Error('Les données ont changé. Relancez l’analyse avant de fusionner.');
    for (const id of ids) if (s.deletedPersonIds?.includes(id) || s.mergedPersons?.[id]) throw new Error('Une fiche a déjà été fusionnée ou supprimée.');
    for (const {keepId,deleteId,edit} of operations) {
      const custom = s.newPersons.find(p => p.id === keepId);
      if (custom) Object.assign(custom, edit); else s.persons[keepId] = {...s.persons[keepId],...edit};
      s.mergedPersons ??= {}; s.mergedPersons[deleteId] = keepId;
      s.deletedPersonIds ??= []; s.deletedPersonIds.push(deleteId);
    }
  });
}

export async function restorePersonHistory(entryId: string, personId: string, actor: string, expectedRevision: number): Promise<void> {
  await changeOverrides(actor, 'Restauration d’une ancienne version de fiche', [personId], state => {
    if ((state.revision ?? 0) !== expectedRevision) throw new Error('Les données ont changé. Rechargez l’historique.');
    const entry = state.history?.find(e => e.id === entryId && e.personIds.includes(personId));
    if (!entry) throw new Error('Version introuvable.');
    if (entry.label.includes('Fusion') || entry.label.includes('Ajout')) throw new Error('Cette opération modifie les liens de famille. Utilisez l’annulation globale si elle est la dernière opération.');
    for (const aliases of [state.mergedPersons, entry.before.mergedPersons]) {
      if (Object.entries(aliases ?? {}).some(([a, b]) => a === personId || b === personId)) throw new Error('Une fusion concerne cette fiche ; restauration individuelle impossible.');
    }
    const oldCustom = entry.before.newPersons.find(p => p.id === personId);
    const currentCustom = state.newPersons.find(p => p.id === personId);
    if (Boolean(oldCustom) !== Boolean(currentCustom)) throw new Error('La structure de cette fiche a changé.');
    if (oldCustom && currentCustom) {
      if (JSON.stringify([oldCustom.relations, oldCustom.relType, oldCustom.relPersonId]) !== JSON.stringify([currentCustom.relations, currentCustom.relType, currentCustom.relPersonId])) throw new Error('Les liens familiaux ont changé.');
      const index = state.newPersons.findIndex(p => p.id === personId);
      state.newPersons[index] = structuredClone(oldCustom);
    }
    if (entry.before.persons[personId]) state.persons[personId] = structuredClone(entry.before.persons[personId]);
    else delete state.persons[personId];
    state.deletedPersonIds = (state.deletedPersonIds ?? []).filter(id => id !== personId);
    if (entry.before.deletedPersonIds?.includes(personId)) state.deletedPersonIds.push(personId);
  });
}
