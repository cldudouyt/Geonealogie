import fs from 'fs';
import path from 'path';
import neo4j from 'neo4j-driver';

type Sex = 'M' | 'F' | 'U';

interface PersonEdit {
  givenNames?: string;
  surname?: string;
  nickname?: string;
  sex?: Sex;
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

interface NewPerson extends PersonEdit {
  id: string;
  givenNames: string;
  surname: string;
  sex: Sex;
  relType?: 'child' | 'parent' | 'spouse';
  relPersonId?: string;
}

interface Overrides {
  persons: Record<string, PersonEdit>;
  newPersons: NewPerson[];
}

function parseArgs() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const fromArg = args.find((a) => a.startsWith('--from='));
  const from = fromArg ? fromArg.replace('--from=', '') : 'data/overrides.json';
  return { dryRun, from };
}

function loadOverrides(filePath: string): Overrides {
  const absolute = path.resolve(process.cwd(), filePath);
  const raw = fs.readFileSync(absolute, 'utf-8');
  const parsed = JSON.parse(raw) as Overrides;
  return {
    persons: parsed.persons ?? {},
    newPersons: parsed.newPersons ?? [],
  };
}

function loadEnvFromFile(file: string): void {
  const absolute = path.resolve(process.cwd(), file);
  if (!fs.existsSync(absolute)) return;
  const lines = fs.readFileSync(absolute, 'utf-8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main() {
  const { dryRun, from } = parseArgs();
  loadEnvFromFile('.env.local');
  loadEnvFromFile('.env');
  const overrides = loadOverrides(from);
  const personsCount = Object.keys(overrides.persons).length;
  const newPersonsCount = overrides.newPersons.length;

  console.log(`[migrate-overrides] Source: ${from}`);
  console.log(`[migrate-overrides] persons=${personsCount}, newPersons=${newPersonsCount}`);

  if (dryRun) {
    console.log('[migrate-overrides] Dry run enabled, no write performed.');
    return;
  }

  const uri = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USER;
  const password = process.env.NEO4J_PASSWORD;

  if (!uri || !user || !password) {
    throw new Error('Missing NEO4J_URI / NEO4J_USER / NEO4J_PASSWORD');
  }

  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  const session = driver.session();

  try {
    const personsJson = JSON.stringify(overrides.persons);
    const newPersonsJson = JSON.stringify(overrides.newPersons);

    await session.run(
      `
        MERGE (o:OverridesState {id: $id})
        SET o.personsJson = $personsJson,
            o.newPersonsJson = $newPersonsJson,
            o.updatedAt = datetime()
        RETURN o.id AS id
      `,
      {
        id: 'global',
        personsJson,
        newPersonsJson,
      },
    );

    console.log('[migrate-overrides] Migration completed.');
  } finally {
    await session.close();
    await driver.close();
  }
}

main().catch((err) => {
  console.error('[migrate-overrides] Failed:', err);
  process.exit(1);
});
