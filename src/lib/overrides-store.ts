import fs from 'fs';
import path from 'path';
import { runSingleQuery } from './neo4j';

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
  relType?: 'child' | 'parent' | 'spouse';
  relPersonId?: string;
}

export interface Overrides {
  persons: Record<string, PersonEdit>;
  newPersons: NewPerson[];
}

const DATA_FILE = path.join(process.cwd(), 'data', 'overrides.json');
const TMP_FILE = '/tmp/geonealogie-overrides.json';
const DB_KEY = 'global';

let _cache: Overrides | null = null;

function shouldUseNeo4j(): boolean {
  return Boolean(process.env.NEO4J_URI && process.env.NEO4J_USER && process.env.NEO4J_PASSWORD);
}

function emptyOverrides(): Overrides {
  return { persons: {}, newPersons: [] };
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

async function loadOverridesFromNeo4j(): Promise<Overrides> {
  type Row = { personsJson?: string; newPersonsJson?: string };

  const row = await runSingleQuery<Row>(
    `
      MERGE (o:OverridesState {id: $id})
      ON CREATE SET o.personsJson = '{}', o.newPersonsJson = '[]', o.updatedAt = datetime()
      RETURN o.personsJson AS personsJson, o.newPersonsJson AS newPersonsJson
    `,
    { id: DB_KEY },
  );

  if (!row) return emptyOverrides();

  try {
    const persons = JSON.parse(row.personsJson || '{}') as Overrides['persons'];
    const newPersons = JSON.parse(row.newPersonsJson || '[]') as Overrides['newPersons'];
    return { persons, newPersons };
  } catch (err) {
    console.error('[overrides] Failed to parse overrides from Neo4j:', err);
    return emptyOverrides();
  }
}

async function persistOverridesToNeo4j(overrides: Overrides): Promise<void> {
  const personsJson = JSON.stringify(overrides.persons);
  const newPersonsJson = JSON.stringify(overrides.newPersons);

  await runSingleQuery(
    `
      MERGE (o:OverridesState {id: $id})
      SET o.personsJson = $personsJson,
          o.newPersonsJson = $newPersonsJson,
          o.updatedAt = datetime()
      RETURN o.id AS id
    `,
    { id: DB_KEY, personsJson, newPersonsJson },
  );
}

export async function loadOverrides(): Promise<Overrides> {
  if (_cache) return _cache;

  if (shouldUseNeo4j()) {
    try {
      _cache = await loadOverridesFromNeo4j();
      return _cache;
    } catch (err) {
      console.error('[overrides] Neo4j load failed, falling back to file:', err);
    }
  }

  _cache = loadOverridesFromFile();
  return _cache;
}

async function persistOverrides(overrides: Overrides): Promise<void> {
  _cache = overrides;

  if (shouldUseNeo4j()) {
    try {
      await persistOverridesToNeo4j(overrides);
      return;
    } catch (err) {
      console.error('[overrides] Neo4j persist failed, falling back to file:', err);
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
