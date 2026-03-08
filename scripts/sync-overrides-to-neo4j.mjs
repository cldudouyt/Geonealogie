/**
 * Sync data/overrides.json → Neo4j OverridesState node
 * Usage: node scripts/sync-overrides-to-neo4j.mjs
 */
import neo4j from 'neo4j-driver';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(__dir, '../data/overrides.json'), 'utf8'));

const uri      = process.env.NEO4J_URI      || 'bolt://localhost:7687';
const user     = process.env.NEO4J_USER     || 'neo4j';
const password = process.env.NEO4J_PASSWORD || 'genealogy2024';

const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
const session = driver.session();

await session.run(
  `MERGE (o:OverridesState {id: $id})
   SET o.personsJson          = $personsJson,
       o.newPersonsJson       = $newPersonsJson,
       o.mergedPersonsJson    = $mergedPersonsJson,
       o.deletedPersonIdsJson = $deletedPersonIdsJson,
       o.ignoredDoublonsJson  = $ignoredDoublonsJson,
       o.updatedAt            = datetime()
   RETURN o.id AS id`,
  {
    id: 'global',
    personsJson:          JSON.stringify(data.persons         ?? {}),
    newPersonsJson:       JSON.stringify(data.newPersons      ?? []),
    mergedPersonsJson:    JSON.stringify(data.mergedPersons   ?? {}),
    deletedPersonIdsJson: JSON.stringify(data.deletedPersonIds ?? []),
    ignoredDoublonsJson:  JSON.stringify(data.ignoredDoublons ?? []),
  }
);

const persons = Object.keys(data.persons ?? {});
const merged  = Object.keys(data.mergedPersons ?? {}).length;
const deleted = (data.deletedPersonIds ?? []).length;

console.log(`✓ OverridesState synced to Neo4j`);
console.log(`  persons overrides : ${persons.length} (${persons.join(', ')})`);
console.log(`  merged persons    : ${merged}`);
console.log(`  deleted persons   : ${deleted}`);

// Clear the Next.js in-memory store cache if the dev server is running
const appUrl = process.env.APP_URL || 'http://localhost:3000';
try {
  const res = await fetch(`${appUrl}/api/admin/clear-cache`, { method: 'POST' });
  if (res.ok) console.log(`✓ Server store cache cleared`);
} catch {
  console.log(`  (dev server not running — restart it to apply changes)`);
}

await session.close();
await driver.close();
