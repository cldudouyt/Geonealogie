import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

let dir: string;

before(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'geo-merge-cascade-'));
  process.env.GEO_DATA_DIR = dir;
  process.env.GEDCOM_PATH = path.resolve(__dirname, 'fixtures/sample.ged');
  delete process.env.DATABASE_URL;
  delete process.env.POSTGRES_URL;
  delete process.env.VERCEL;
  // I14 (duplicate child) merges into I13 first, then I12 (duplicate mother)
  // merges into I11 — reproducing the real-world order where a person's own
  // duplicate is resolved before their parent's duplicate is noticed.
  await writeFile(path.join(dir, 'overrides.json'), JSON.stringify({
    persons: {}, newPersons: [], mergedPersons: { I14: 'I13', I12: 'I11' },
  }));
  const { clearStore } = await import('../src/lib/gedcom-store');
  clearStore();
});

after(async () => {
  const { clearStore } = await import('../src/lib/gedcom-store');
  clearStore();
  delete process.env.GEDCOM_PATH;
  await rm(dir, { recursive: true, force: true });
});

test('a cascading merge never leaves a duplicate id in a relation list', async () => {
  const { getParents, getChildren } = await import('../src/lib/gedcom-store');

  // I13 absorbed I14, whose second parent (I12) was itself later merged into
  // I11 — I13's parent list must end up as [I10, I11], not [I10, I11, I11].
  const parents = await getParents('I13');
  assert.deepEqual(parents.map(p => p.id).sort(), ['I10', 'I11']);

  const children = await getChildren('I10');
  assert.deepEqual(children.map(c => c.id).sort(), ['I13']);
});
