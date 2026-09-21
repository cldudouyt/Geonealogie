import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

let dir: string;

before(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'geo-gedcom-tests-'));
  process.env.GEO_DATA_DIR = dir;
  process.env.GEDCOM_PATH = path.resolve(__dirname, 'fixtures/sample.ged');
  delete process.env.DATABASE_URL;
  delete process.env.POSTGRES_URL;
  delete process.env.VERCEL;
  const { clearStore } = await import('../src/lib/gedcom-store');
  clearStore();
});

after(async () => {
  const { clearStore } = await import('../src/lib/gedcom-store');
  clearStore();
  delete process.env.GEDCOM_PATH;
  await rm(dir, { recursive: true, force: true });
});

test('parses names, sex, dates and places, including MAP coordinates', async () => {
  const { getPerson } = await import('../src/lib/gedcom-store');
  const jean = await getPerson('I1');
  assert.ok(jean);
  assert.equal(jean!.displayName, 'Jean Charles DUDOUYT');
  assert.equal(jean!.sex, 'M');
  assert.equal(jean!.birthDate, '1900-06-10');
  assert.equal(jean!.birthYear, '1900');
  assert.equal(jean!.birthPlace, 'Nantes');
  assert.ok(Math.abs((jean!.birthLat ?? 0) - 47.21837) < 1e-6);
  assert.ok(Math.abs((jean!.birthLon ?? 0) - -1.55362) < 1e-6);
  assert.equal(jean!.deathDate, '1980-05-05');
  assert.equal(jean!.deathYear, '1980');
});

test('builds parent/child/sibling/spouse relationships from FAM records', async () => {
  const { getParents, getChildren, getSiblings, getSpouses } = await import('../src/lib/gedcom-store');

  const parents = await getParents('I3');
  assert.deepEqual(parents.map(p => p.id).sort(), ['I1', 'I2']);

  const children = await getChildren('I3');
  assert.deepEqual(children.map(p => p.id).sort(), ['I5', 'I6']);

  const siblings = await getSiblings('I5');
  assert.deepEqual(siblings.map(p => p.id), ['I6']);

  const spouses = await getSpouses('I3');
  assert.equal(spouses.length, 1);
  assert.equal(spouses[0].person?.id, 'I4');
  assert.equal(spouses[0].marriageDate, '1958-09-10');
});

test('resolves adoptive parent/child links from a free-text adoption note', async () => {
  const { getPerson } = await import('../src/lib/gedcom-store');
  const camille = await getPerson('I7');
  const pierre = await getPerson('I3');
  assert.equal(camille!.isAdopted, true);
  assert.deepEqual(camille!.adoptiveParentIds, ['I3']);
  assert.deepEqual(pierre!.adoptedChildIds, ['I7']);
});

test('getTreeCentered includes ancestors, descendants, spouses and adoption links', async () => {
  const { getTreeCentered } = await import('../src/lib/gedcom-store');
  const tree = await getTreeCentered('I3', 2);

  assert.equal(tree.rootId, 'I3');
  assert.deepEqual(tree.nodes.map(n => n.id).sort(), ['I1', 'I2', 'I3', 'I4', 'I5', 'I6', 'I7']);

  const hasLink = (source: string, target: string, type: string) =>
    tree.links.some(l => l.type === type && (
      (l.source === source && l.target === target) ||
      (l.source === target && l.target === source)
    ));

  assert.ok(hasLink('I1', 'I3', 'parent'));
  assert.ok(hasLink('I2', 'I3', 'parent'));
  assert.ok(hasLink('I3', 'I5', 'parent'));
  assert.ok(hasLink('I3', 'I6', 'parent'));
  assert.ok(hasLink('I1', 'I2', 'spouse'));
  assert.ok(hasLink('I3', 'I4', 'spouse'));
  assert.ok(hasLink('I3', 'I7', 'adoption'));
});

test('findRelationshipPath walks parent/child steps between grandparent and grandchild', async () => {
  const { findRelationshipPath } = await import('../src/lib/gedcom-store');
  const path_ = await findRelationshipPath('I1', 'I5');
  assert.ok(path_);
  assert.deepEqual(path_!.map(s => [s.personId, s.relation]), [
    ['I1', 'départ'],
    ['I3', 'enfant'],
    ['I5', 'enfant'],
  ]);
});

test('searchPersons matches by substring, is accent-insensitive, and tolerates typos', async () => {
  const { searchPersons } = await import('../src/lib/gedcom-store');

  const bySurname = await searchPersons('Dudouyt');
  assert.ok(bySurname.length >= 5);
  assert.ok(bySurname.every(p => p.surname === 'DUDOUYT'));

  const byAccent = await searchPersons('eleonore');
  assert.ok(byAccent.some(p => p.displayName.includes('Éléonore')));

  const byTypo = await searchPersons('Duduyt');
  assert.ok(byTypo.some(p => p.surname === 'DUDOUYT'));

  assert.deepEqual(await searchPersons(''), []);
});
