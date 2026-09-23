import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { consumeLimit, resetLimit, limitKey } from '../src/lib/request-limits';
import { parseAIRequest, boundedJSON } from '../src/lib/ai-request';
import { saveDocumentMeta, getDocumentsForPerson, deleteDocument } from '../src/lib/documents-store';
let dir: string;
before(async () => { dir = await mkdtemp(path.join(os.tmpdir(), 'geo-open-issues-')); process.env.GEO_DATA_DIR = dir; process.env.AUTH_SECRET = 'qa-limit-secret'; delete process.env.DATABASE_URL; delete process.env.POSTGRES_URL; delete process.env.VERCEL; });
after(async () => rm(dir, { recursive: true, force: true }));
test('durable limiter admits only five concurrent attempts and expires the window', async () => {
  const key = limitKey('login', 'test-ip');
  assert.ok(!key.includes('test-ip'));
  const results = await Promise.all(Array.from({ length: 12 }, () => consumeLimit(key, 5, 900000, 1, 1000)));
  assert.equal(results.filter(Boolean).length, 5);
  assert.equal(await consumeLimit(key, 5, 900000, 1, 1001), false);
  assert.equal(await consumeLimit(key, 5, 900000, 1, 901000), true);
  await resetLimit(key);
  assert.equal(await consumeLimit(key, 5, 900000, 1, 901001), true);
});
test('AI validation bounds task count, names, payload sizes and actual stream bytes', async () => {
  const task = { name: 'one', systemPrompt: 'System', userMessage: 'Message' };
  assert.ok(parseAIRequest({ mode: 'parallel', tasks: [task] }));
  for (const body of [null, {}, { mode: 'chat', message: 12 }, { mode: 'chat', message: 'a'.repeat(8001) }, { mode: 'parallel', tasks: Array(4).fill(task) }, { mode: 'parallel', tasks: [task, task] }, { mode: 'parallel', tasks: [{ ...task, systemPrompt: null }] }]) assert.equal(parseAIRequest(body), null);
  assert.deepEqual(await boundedJSON(new Request('http://local', { method: 'POST', body: '{"ok":true}' })), { ok: true });
  await assert.rejects(boundedJSON(new Request('http://local', { method: 'POST', body: 'invalid' })));
  await assert.rejects(boundedJSON(new Request('http://local', { method: 'POST', body: 'a'.repeat(32769), headers: { 'content-length': '1' } })), /volumineux/);
});
test('failed storage deletion keeps a retryable record and deletes both URLs before metadata', async () => {
  await saveDocumentMeta({ id: 'doc', personId: 'person', url: 'https://private/doc', legacyPublicUrl: 'https://public/doc', originalName: 'doc', mimeType: 'text/plain', size: 1, uploadedAt: '2026-09-22' });
  await assert.rejects(deleteDocument('person', 'doc', async () => { throw new Error('Storage outage'); }), /Storage outage/);
  assert.equal((await getDocumentsForPerson('person'))[0].deletionPending, true);
  const removed: string[] = [];
  assert.equal(await deleteDocument('person', 'doc', async url => { removed.push(url); }), true);
  assert.deepEqual(removed, ['https://private/doc', 'https://public/doc']);
  assert.deepEqual(await getDocumentsForPerson('person'), []);
  assert.equal(await deleteDocument('person', 'doc'), false);
});
test('limiting failures do not admit requests when durable storage is absent in production', async () => {
  process.env.VERCEL = '1';
  try { await assert.rejects(consumeLimit('failure', 5, 1000), /base de données/); }
  finally { delete process.env.VERCEL; }
});
