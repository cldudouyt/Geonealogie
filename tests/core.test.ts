import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadOverrides, savePersonEdit, addNewPerson, mergePerson, restoreLatest } from '../src/lib/overrides-store';
import { authenticate, makeSessionToken, readSessionToken, permits } from '../src/lib/auth';
import { saveDocumentMeta, getDocumentsForPerson, deleteDocumentMeta } from '../src/lib/documents-store';
import { readState, mutateVersioned } from '../src/lib/state-store';
let dir: string;
before(async () => { dir = await mkdtemp(path.join(os.tmpdir(), 'geo-tests-')); process.env.GEO_DATA_DIR = dir; delete process.env.DATABASE_URL; delete process.env.POSTGRES_URL; delete process.env.VERCEL; process.env.AUTH_SECRET = 'test-only-secret'; process.env.AUTH_PASSWORD = 'test-admin'; process.env.AUTH_USERS_JSON = JSON.stringify([{ name: 'Family reader', role: 'reader', password: 'test-reader' }]); });
after(async () => { await rm(dir, { recursive: true, force: true }); });
test('role-bound sessions reject tampering, revoked credentials and expired tokens', async () => {
  const account = await authenticate('test-reader'); assert.ok(account);
  const token = await makeSessionToken(account);
  assert.equal((await readSessionToken(token))?.role, 'reader');
  assert.equal(await readSessionToken(token + 'x'), null);
  assert.equal(await authenticate('wrong'), null);
  assert.equal(permits('reader', 'contributor'), false); assert.equal(permits('admin', 'contributor'), true);
  const realNow = Date.now; Date.now = () => realNow() + 31 * 86400000;
  try { assert.equal(await readSessionToken(token), null); } finally { Date.now = realNow; }
  process.env.AUTH_USERS_JSON = '[]'; assert.equal(await readSessionToken(token), null);
});
test('parallel writes on different persons preserve every edit', async () => {
  await Promise.all(Array.from({ length: 12 }, (_, i) => savePersonEdit(`P${i}`, { nickname: `Name ${i}` }, 'QA')));
  const state = await loadOverrides(); assert.equal(Object.keys(state.persons).length, 12); assert.equal(state.history?.length, 12);
});
test('stale form versions are rejected and persisted changes survive', async () => {
  const version = (await loadOverrides()).personVersions?.P0 ?? 0;
  await savePersonEdit('P0', { nickname: 'Newer' }, 'QA', version);
  await assert.rejects(savePersonEdit('P0', { nickname: 'Stale' }, 'QA', version), /changé/);
  assert.equal((await loadOverrides()).persons.P0.nickname, 'Newer');
});
test('editing a newly created person updates the effective custom record', async () => {
  await addNewPerson({ id: 'custom-test', givenNames: 'Test', surname: 'Family', sex: 'U' }, 'QA');
  await savePersonEdit('custom-test', { nickname: 'Updated' }, 'QA', 1);
  assert.equal((await loadOverrides()).newPersons.find(p => p.id === 'custom-test')?.nickname, 'Updated');
});
test('merge is atomic, detects stale previews, and can be restored', async () => {
  const before = await loadOverrides();
  await assert.rejects(mergePerson('P0', 'P1', {}, 'QA', (before.revision ?? 0) - 1), /changé/);
  await mergePerson('P0', 'P1', { nickname: 'Merged' }, 'QA', before.revision);
  const merged = await loadOverrides(); assert.equal(merged.mergedPersons?.P1, 'P0'); assert.equal(merged.persons.P0.nickname, 'Merged');
  await restoreLatest(merged.history!.at(-1)!.id, 'QA');
  const restored = await loadOverrides(); assert.equal(restored.mergedPersons?.P1, undefined); assert.equal(restored.persons.P0.nickname, before.persons.P0.nickname);
  assert.ok((restored.personVersions?.P0 ?? 0) > (merged.personVersions?.P0 ?? 0));
  await assert.rejects(restoreLatest(merged.history!.at(-1)!.id, 'QA'), /récente/);
});
test('corrupt storage and unavailable durable storage fail visibly', async () => {
  await writeFile(path.join(dir, 'broken.json'), '{'); await assert.rejects(readState('broken', {}));
  process.env.VERCEL = '1';
  try { await assert.rejects(savePersonEdit('P0', { nickname: 'Must not be saved' }), /indisponible/); } finally { delete process.env.VERCEL; }
});

test('versioned writes retry on concurrent updates without losing unrelated edits', async () => {
  let row = { data: {} as Record<string, string>, version: 0 };
  const read = async () => structuredClone(row);
  const compareSet = async (version: number | null, data: Record<string, string>) => {
    if (version !== row.version) return false;
    row = { data: structuredClone(data), version: row.version + 1 }; return true;
  };
  await Promise.all(Array.from({length: 5}, (_, i) => mutateVersioned(read, compareSet, async () => ({}), data => { data[String(i)] = `change ${i}`; })));
  assert.equal(row.version, 5); assert.equal(Object.keys(row.data).length, 5);
});
test('versioned writes propagate database outages instead of claiming success', async () => {
  await assert.rejects(mutateVersioned(async () => { throw new Error('Database offline'); }, async () => true, async () => ({}), () => undefined), /offline/);
  await assert.rejects(mutateVersioned(async () => ({ data: {}, version: 1 }), async () => false, async () => ({}), () => undefined), /autre modification/);
});

test('documents follow a merge and restoration without moving or losing files', async () => {
  await saveDocumentMeta({ id: 'doc-test', personId: 'P1', url: '/documents/P1/test.pdf', originalName: 'test.pdf', mimeType: 'application/pdf', size: 1, uploadedAt: new Date().toISOString() });
  await mergePerson('P0', 'P1', {}, 'QA');
  assert.equal((await getDocumentsForPerson('P0'))[0].id, 'doc-test');
  await restoreLatest((await loadOverrides()).history!.at(-1)!.id, 'QA');
  assert.equal((await getDocumentsForPerson('P0')).length, 0);
  assert.equal((await getDocumentsForPerson('P1')).length, 1);
  await mergePerson('P0', 'P1', {}, 'QA');
  assert.equal((await deleteDocumentMeta('P0', 'doc-test'))?.personId, 'P1');
  assert.equal((await getDocumentsForPerson('P0')).length, 0);
});
