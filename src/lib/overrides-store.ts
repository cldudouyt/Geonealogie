/**
 * Overrides store — persists manual edits on top of GEDCOM data.
 * Writes to data/overrides.json (dev) or /tmp/overrides.json (Vercel).
 */
import fs from 'fs';
import path from 'path';

export interface PersonEdit {
  givenNames?: string;
  surname?: string;
  nickname?: string;
  sex?: 'M' | 'F' | 'U';
  birthDateRaw?: string;
  birthPlace?: string;
  birthPlaceFull?: string;
  deathDateRaw?: string;
  deathPlace?: string;
  deathPlaceFull?: string;
  burialDateRaw?: string;
  burialPlace?: string;
  chrDateRaw?: string;
  chrPlace?: string;
  occupation?: string;
  nationality?: string;
  isAdopted?: boolean;
  notes?: string;
}

export interface NewPerson extends PersonEdit {
  id: string;
  givenNames: string;
  surname: string;
  sex: 'M' | 'F' | 'U';
  /** Relationship to an existing person */
  relType?: 'child' | 'parent' | 'spouse';
  relPersonId?: string;
}

export interface Overrides {
  persons: Record<string, PersonEdit>;
  newPersons: NewPerson[];
}

const DATA_FILE = path.join(process.cwd(), 'data', 'overrides.json');
const TMP_FILE  = '/tmp/geonealogie-overrides.json';

let _cache: Overrides | null = null;

function getFilePath(): string {
  // Prefer /tmp version if it exists (contains in-session edits on Vercel)
  try {
    if (fs.existsSync(TMP_FILE)) return TMP_FILE;
  } catch { /* ignore */ }
  return DATA_FILE;
}

function writeFilePath(): string {
  // Try to write to project data/ first; if not writable, use /tmp
  try {
    fs.accessSync(path.dirname(DATA_FILE), fs.constants.W_OK);
    return DATA_FILE;
  } catch {
    return TMP_FILE;
  }
}

export function loadOverrides(): Overrides {
  if (_cache) return _cache;
  try {
    const file = getFilePath();
    const raw = fs.readFileSync(file, 'utf-8');
    _cache = JSON.parse(raw) as Overrides;
    _cache.persons    ??= {};
    _cache.newPersons ??= [];
  } catch {
    _cache = { persons: {}, newPersons: [] };
  }
  return _cache;
}

function persistOverrides(overrides: Overrides): void {
  _cache = overrides;
  const file = writeFilePath();
  // Also sync to /tmp so future reads pick up session edits on Vercel
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

export function savePersonEdit(id: string, edit: PersonEdit): void {
  const overrides = loadOverrides();
  overrides.persons[id] = { ...overrides.persons[id], ...edit };
  persistOverrides(overrides);
}

export function addNewPerson(person: NewPerson): void {
  const overrides = loadOverrides();
  // Remove existing entry with same id if any
  overrides.newPersons = overrides.newPersons.filter(p => p.id !== person.id);
  overrides.newPersons.push(person);
  persistOverrides(overrides);
}

export function clearOverridesCache(): void {
  _cache = null;
}
