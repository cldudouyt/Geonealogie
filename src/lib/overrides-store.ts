import fs from 'fs';
import os from 'os';
import path from 'path';
import { hasDb, kvGet, kvSet } from './db';

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

export interface Overrides {
  persons: Record<string, PersonEdit>;
  newPersons: NewPerson[];
  deletedPersonIds?: string[];
  /** deleteId → keepId */
  mergedPersons?: Record<string, string>;
  /** sorted "idA:idB" pairs to ignore in duplicate detection */
  ignoredDoublons?: string[];
}

const DATA_FILE = path.join(process.cwd(), 'data', 'overrides.json');
const TMP_FILE = path.join(os.tmpdir(), 'geonealogie-overrides.json');
const DB_KEY = 'overrides';

let _cache: Overrides | null = null;

function emptyOverrides(): Overrides {
  return { persons: {}, newPersons: [], deletedPersonIds: [], mergedPersons: {}, ignoredDoublons: [] };
}

function getFilePath(): string {
  try {
    if (fs.existsSync(TMP_FILE)) return TMP_FILE;
  } catch {
    // ignore
  }
  return DATA_FILE;
}

function writeFilePath(): string {
  try {
    fs.accessSync(path.dirname(DATA_FILE), fs.constants.W_OK);
    return DATA_FILE;
  } catch {
    return TMP_FILE;
  }
}

function loadOverridesFromFile(): Overrides {
  try {
    const file = getFilePath();
    const raw = fs.readFileSync(file, 'utf-8');
    const parsed = JSON.parse(raw) as Overrides;
    parsed.persons ??= {};
    parsed.newPersons ??= [];
    parsed.deletedPersonIds ??= [];
    parsed.mergedPersons ??= {};
    parsed.ignoredDoublons ??= [];
    return parsed;
  } catch {
    return emptyOverrides();
  }
}

function persistOverridesToFile(overrides: Overrides): void {
  const file = writeFilePath();
  try {
    const json = JSON.stringify(overrides, null, 2);
    fs.writeFileSync(file, json, 'utf-8');
    if (file !== TMP_FILE) {
      fs.writeFileSync(TMP_FILE, json, 'utf-8');
    }
  } catch (err) {
    console.error('[overrides] Failed to write overrides file:', err);
  }
}

async function loadOverridesFromDb(): Promise<Overrides> {
  const stored = await kvGet<Overrides>(DB_KEY);
  if (!stored) {
    // First read on a fresh database: seed from the committed file so manual
    // merges and edits survive the storage migration.
    const fromFile = loadOverridesFromFile();
    try {
      await kvSet(DB_KEY, fromFile);
    } catch (err) {
      console.error('[overrides] Failed to seed DB from file:', err);
    }
    return fromFile;
  }
  stored.persons ??= {};
  stored.newPersons ??= [];
  stored.deletedPersonIds ??= [];
  stored.mergedPersons ??= {};
  stored.ignoredDoublons ??= [];
  return stored;
}

export async function loadOverrides(): Promise<Overrides> {
  if (_cache) return _cache;

  if (hasDb()) {
    try {
      _cache = await loadOverridesFromDb();
      return _cache;
    } catch (err) {
      console.error('[overrides] DB load failed, falling back to file:', err);
    }
  }

  _cache = loadOverridesFromFile();
  return _cache;
}

async function persistOverrides(overrides: Overrides): Promise<void> {
  _cache = overrides;

  if (hasDb()) {
    try {
      await kvSet(DB_KEY, overrides);
      return;
    } catch (err) {
      console.error('[overrides] DB persist failed, falling back to file:', err);
    }
  }

  persistOverridesToFile(overrides);
}

export async function savePersonEdit(id: string, edit: PersonEdit): Promise<void> {
  const overrides = await loadOverrides();
  overrides.persons[id] = { ...overrides.persons[id], ...edit };
  await persistOverrides(overrides);
}

export async function addNewPerson(person: NewPerson): Promise<void> {
  const overrides = await loadOverrides();
  overrides.newPersons = overrides.newPersons.filter((p) => p.id !== person.id);
  overrides.newPersons.push(person);
  await persistOverrides(overrides);
}

export function clearOverridesCache(): void {
  _cache = null;
}

export async function commitOverridesToGitHub(): Promise<void> {
  // Kept for backward compatibility; DB persistence supersedes git commits.
}

export async function deletePerson(id: string): Promise<void> {
  const overrides = await loadOverrides();
  overrides.deletedPersonIds ??= [];
  if (!overrides.deletedPersonIds.includes(id)) {
    overrides.deletedPersonIds.push(id);
  }
  // Remove from newPersons if it's a custom person
  overrides.newPersons = overrides.newPersons.filter(p => p.id !== id);
  await persistOverrides(overrides);
}

export async function mergePerson(keepId: string, deleteId: string): Promise<void> {
  const overrides = await loadOverrides();
  overrides.mergedPersons ??= {};
  overrides.mergedPersons[deleteId] = keepId;
  overrides.deletedPersonIds ??= [];
  if (!overrides.deletedPersonIds.includes(deleteId)) {
    overrides.deletedPersonIds.push(deleteId);
  }
  overrides.newPersons = overrides.newPersons.filter(p => p.id !== deleteId);
  await persistOverrides(overrides);
}

export async function ignoreDoublon(idA: string, idB: string): Promise<void> {
  const overrides = await loadOverrides();
  overrides.ignoredDoublons ??= [];
  const key = [idA, idB].sort().join(':');
  if (!overrides.ignoredDoublons.includes(key)) {
    overrides.ignoredDoublons.push(key);
  }
  await persistOverrides(overrides);
}
