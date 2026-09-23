import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { savePersonEdit, loadOverrides, restorePersonHistory, mergePerson } from '../src/lib/overrides-store';
import { narrativeFacts, narrativeFingerprint } from '../src/lib/narrative-facts';
import { updateNarrative, getNarrative } from '../src/lib/narratives-store';
import type { PersonRecord } from '../src/lib/gedcom-store';
import { isLegacyBlob } from '../src/lib/document-privacy';
let dir: string;
before(async () => { dir = await mkdtemp(path.join(os.tmpdir(), 'geo-reliability-')); process.env.GEO_DATA_DIR = dir; delete process.env.DATABASE_URL; delete process.env.POSTGRES_URL; delete process.env.VERCEL; });
after(async () => rm(dir, { recursive: true, force: true }));
test('restoring an old person snapshot preserves later edits on other people and rejects stale confirmations', async () => {
  await savePersonEdit('A', { notes: 'original' });
  await savePersonEdit('A', { notes: 'mistake' });
  const id = (await loadOverrides()).history!.at(-1)!.id;
  await savePersonEdit('B', { notes: 'later contribution' });
  const revision = (await loadOverrides()).revision!;
  await restorePersonHistory(id, 'A', 'QA', revision);
  const after = await loadOverrides();
  assert.equal(after.persons.A.notes, 'original');
  assert.equal(after.persons.B.notes, 'later contribution');
  await assert.rejects(restorePersonHistory(id, 'A', 'QA', revision), /changé/);
  await mergePerson('A', 'B');
  await assert.rejects(restorePersonHistory(id, 'A', 'QA', (await loadOverrides()).revision!), /fusion/);
});
test('AI payload omits free text, relatives and identifying dates for unknown living status', () => {
  const person = { id: 'A', displayName: 'Test', notes: 'private note', birthDateRaw: '1 JAN 2000', birthPlace: 'Private place', occupations: ['Private job'], events: [{ note: 'Private event' }] } as PersonRecord;
  const unknown = JSON.stringify(narrativeFacts(person));
  assert.equal(unknown.includes('Private'), false); assert.equal(unknown.includes('2000'), false); assert.equal(unknown.includes('private note'), false);
  const deceased = { ...person, deathDateRaw: '1 JAN 2020' };
  assert.ok(JSON.stringify(narrativeFacts(deceased)).includes('2020'));
  assert.equal(JSON.stringify(narrativeFacts(deceased)).includes('private note'), false);
  assert.notEqual(narrativeFingerprint(person, []), narrativeFingerprint({ ...person, notes: 'changed' }, []));
  assert.notEqual(narrativeFingerprint(person, []), narrativeFingerprint(person, [{ reference: 'new source' }]));
});
test('portrait updates reject concurrent editors', async () => {
  await updateNarrative('A', { text: 'one', generatedAt: new Date().toISOString() }, 0);
  await assert.rejects(updateNarrative('A', { text: 'stale', generatedAt: new Date().toISOString() }, 0), /changé/);
  assert.equal((await getNarrative('A'))?.text, 'one');
});
test('migration only reads known public Blob origins', () => {
  assert.equal(isLegacyBlob('https://store.public.blob.vercel-storage.com/file'), true);
  for (const url of ['http://localhost/file', 'https://evil.com/store.public.blob.vercel-storage.com', 'https://store.public.blob.vercel-storage.com.evil.com/file', '/documents/x']) assert.equal(isLegacyBlob(url), false);
});
