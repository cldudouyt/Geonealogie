import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
const dir = await mkdtemp(path.join(os.tmpdir(), 'geo-recovery-'));
const mediaDir = path.join('public', 'documents', `qa-${path.basename(dir)}`);
await mkdir(mediaDir, { recursive: true }); await writeFile(path.join(mediaDir, 'test.txt'), 'Archive QA exact bytes');
const before = { persons: {}, newPersons: [{ id: 'qa-person', givenNames: 'Camille', surname: 'QA', sex: 'U', notes: 'Original' }, { id: 'qa-other', givenNames: 'Autre', surname: 'QA', sex: 'U', notes: 'Original B' }], revision: 0 };
const state = structuredClone(before); state.newPersons[0].notes = 'Erreur'; state.newPersons[1].notes = 'Contribution ultérieure'; state.revision = 2;
state.history = [{ id: 'qa-history', at: '2026-09-21T10:00:00Z', actor: 'QA', label: 'Modification de fiche', personIds: ['qa-person'], before }];
await writeFile(path.join(dir, 'overrides.json'), JSON.stringify(state));
await writeFile(path.join(dir, 'documents.json'), JSON.stringify({ 'qa-person': [{ id: 'qa-doc', personId: 'qa-person', url: '/' + mediaDir.replace(/^public\//, '') + '/test.txt', originalName: 'test.txt', mimeType: 'text/plain', size: 22, uploadedAt: new Date().toISOString() }] }));
const base = 'http://localhost:3107';
const emailFor = p => ({"qa-admin":"admin@qa.local","qa-reader":"reader@qa.local","qa-contributor":"contributor@qa.local"})[p] ?? "admin@qa.local";
const env = { ...process.env, GEDCOM_PATH: path.resolve('tests/fixtures/sample.ged'), GEO_DATA_DIR: dir, AUTH_SECRET: 'qa-local-recovery-only', AUTH_PASSWORD: 'qa-admin', AUTH_ADMIN_EMAIL: 'admin@qa.local', AUTH_USERS_JSON: JSON.stringify([{ name: 'QA reader', role: 'reader', password: 'qa-reader', email: 'reader@qa.local' }]) };
for (const key of ['DATABASE_URL','POSTGRES_URL','VERCEL','BLOB_READ_WRITE_TOKEN','BLOB_PRIVATE_READ_WRITE_TOKEN','ANTHROPIC_API_KEY','ANTHROPIC_AUTH_TOKEN']) delete env[key];
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next',process.env.QA_DEV ? 'dev' : 'start','--hostname','127.0.0.1','--port','3107'], { env, stdio: ['ignore','pipe','pipe'] });
let logs = ''; server.stdout.on('data', b => logs += b); server.stderr.on('data', b => logs += b);
let browser;
try {
  for (let i = 0; i < 100; i++) { try { if ((await fetch(base + '/login')).ok) break; } catch {} if (i === 99) throw new Error(logs); await new Promise(r => setTimeout(r, 200)); }
  browser = await chromium.launch({ executablePath: process.env.QA_CHROMIUM, headless: true, args: ['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  await context.route(/https?:\/\/(?!localhost)/, r => r.abort());
  // Never forward genealogy searches to external archive providers in local QA.
  await context.route('**/api/research/**', r => r.fulfill({ json: { total: 0, results: [] } }));
  const page = await context.newPage(); page.setDefaultTimeout(30000); if (process.env.QA_DEV) page.on('console', msg => { if(msg.type() === 'error') console.log('CONSOLE', msg.text()); }); const errors = []; page.on('pageerror', e => { errors.push(e.message); console.error('PAGE ERROR', page.url(), e.message); });
  const login = async password => { await page.goto(base + '/login'); await page.locator('input[type=email]').fill(emailFor(password)); await page.locator('input[type=password]').fill(password); await page.locator('button[type=submit]').click(); await page.waitForURL(base + '/'); };
  const mobile = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow ${page.url()}`);
  assert.equal((await context.request.get(base + '/api/export/backup')).status(), 401);
  await login('qa-admin');
  await page.getByLabel('Retrouver une personne').fill('Camille'); await page.getByRole('button', { name: 'Rechercher', exact: true }).click(); await page.waitForURL(/search\?q=Camille/); await mobile();
  await page.goto(base + '/person/qa-person');
  await page.getByRole('button', { name: 'Rédiger le portrait' }).click(); await page.getByLabel('Texte du portrait').fill('Camille est membre de notre famille.'); await page.getByRole('button', { name: 'Enregistrer et valider' }).click(); await page.getByText('Portrait enregistré.', { exact: true }).waitFor(); await mobile();
  assert.equal((await context.request.post(base + '/api/persons/qa-person/narrative')).status(), 400);
  await page.goto(base + '/history?person=qa-person'); await mobile();
  await page.getByText('Restaurer cette version de la fiche qa-person', { exact: true }).click(); await page.getByRole('button', { name: 'Confirmer pour cette fiche' }).click(); await page.getByText('Fiche restaurée.', { exact: true }).waitFor();
  assert.equal((await (await context.request.get(base + '/api/persons/qa-person')).json()).person.notes, 'Original');
  assert.equal((await (await context.request.get(base + '/api/persons/qa-other')).json()).person.notes, 'Contribution ultérieure');
  await page.goto(base + '/person/qa-person'); await page.getByText(/À revoir : la fiche a changé/).waitFor();
  await page.goto(base + '/person/qa-person?tab=sources'); assert.equal(await page.getByRole('tab', { name: 'Sources', exact: true }).getAttribute('aria-selected'), 'true');
  await page.goto(base + '/history');
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Télécharger la sauvegarde avec fichiers' }).click(); const archiveFile = await (await download).path(); const archive = JSON.parse(await readFile(archiveFile, 'utf8'));
  assert.equal(archive.format, 'geonealogie-backup-v2'); assert.equal(archive.assets.length, 1); assert.equal(Buffer.from(archive.assets[0].data.split(',')[1], 'base64').toString(), 'Archive QA exact bytes');
  await page.getByText('Récupérer les fichiers d’une sauvegarde', { exact: true }).click(); await page.getByLabel('Sauvegarde à vérifier').setInputFiles(archiveFile); await page.getByText(/Archive vérifiée : 1 fichier/).waitFor();
  // Navigation within the same search route must replace both inputs and results.
  await page.goto(base + '/search?q=Camille&surname=QA');
  await page.locator('main a[href="/person/qa-person"]').waitFor();
  await page.getByPlaceholder('Nom, prénom, lieu, date…').fill('Autre');
  await page.locator('main button[type=submit]').click();
  await page.waitForURL(/q=Autre&surname=QA/);
  assert.equal(await page.getByLabel('Nom de famille', { exact: true }).inputValue(), 'QA');
  await page.locator('main a[href="/person/qa-other"]').waitFor();
  await page.goBack();
  await page.locator('main a[href="/person/qa-person"]').waitFor();
  assert.equal(await page.getByPlaceholder('Nom, prénom, lieu, date…').inputValue(), 'Camille');
  await page.getByRole('combobox', { name: 'Rechercher une personne' }).fill('Autre');
  await page.getByRole('combobox', { name: 'Rechercher une personne' }).press('Enter');
  await page.waitForURL(base + '/search?q=Autre');
  await page.locator('main a[href="/person/qa-other"]').waitFor();
  assert.equal(await page.getByPlaceholder('Nom, prénom, lieu, date…').inputValue(), 'Autre');
  for (const data of [{}, { mode: 'chat', message: 'a'.repeat(8001) }, { mode: 'parallel', tasks: Array(4).fill({}) }]) assert.equal((await context.request.post(base + '/api/ai', { data })).status(), 400);
  assert.equal((await context.request.post(base + '/api/ai', { data: 'a'.repeat(32769), headers: { 'Content-Type': 'application/json' } })).status(), 400);
  // No API key is present: errors must be sanitized and returned before streaming 200.
  for (let i = 0; i < 10; i++) assert.equal((await context.request.post(base + '/api/ai', { data: { mode: 'chat', message: 'Synthetic QA' } })).status(), 502);
  assert.equal((await context.request.post(base + '/api/ai', { data: { mode: 'chat', message: 'Synthetic QA' } })).status(), 429);
  const uploaded = await context.request.post(base + '/api/persons/qa-person/documents', { multipart: { file: { name: 'qa.txt', mimeType: 'text/plain', buffer: Buffer.from('Synthetic QA') } } });
  assert.equal(uploaded.status(), 201);
  const { document: doc } = await uploaded.json();
  const storagePath = path.join('public', doc.url);
  await rm(storagePath); await mkdir(storagePath); // EISDIR simulates a storage failure.
  const deletionUrl = base + '/api/persons/qa-person/documents/' + doc.id;
  assert.equal((await context.request.delete(deletionUrl)).status(), 503);
  assert.equal((await context.request.get(deletionUrl + '/file')).status(), 410);
  assert.ok((await (await context.request.get(base + '/api/persons/qa-person/documents')).json()).documents.find(d => d.id === doc.id).deletionPending);
  await rm(storagePath, { recursive: true });
  assert.equal((await context.request.delete(deletionUrl)).status(), 200);
  assert.equal((await context.request.delete(deletionUrl)).status(), 404);
  for (let round = 0; round < Number(process.env.QA_REPEAT || 1); round++) for (const route of ['/admin','/admin/privacy','/anomalies','/','/tree','/map','/network','/anniversaires','/relation','/timeline','/stats','/doublons','/feedback','/feedback/new','/person/new','/admin/geocode','/admin/feedback']) { const response = await page.goto(base + route); assert.equal(response.status(), 200, route); await page.waitForLoadState('networkidle'); await mobile(); console.log('PASS route', route); }
  await mkdir('/tmp/geonealogie-screens', { recursive: true }); await page.screenshot({ path: '/tmp/geonealogie-screens/home-reliability-mobile.png', fullPage: true });
  await context.clearCookies(); await login('qa-reader');
  for (const route of ['/admin','/history','/api/export/backup','/api/admin/backup-photo?id=qa-person']) assert.equal((await context.request.get(base + route)).status(), 403);
  assert.equal((await context.request.patch(base + '/api/persons/qa-person/narrative', { data: { text: 'forbidden' } })).status(), 403);
  assert.equal((await context.request.post(base + '/api/ai', { data: { mode: 'chat', message: 'Synthetic QA' } })).status(), 403);
  await context.clearCookies();
  await page.goto(base + '/login');
  for (let i = 0; i < 5; i++) {
    await page.locator('input[type=email]').fill(emailFor('wrong-synthetic-password')); await page.locator('input[type=password]').fill('wrong-synthetic-password');
    await page.locator('button[type=submit]').click();
    await page.getByText('Mot de passe incorrect ou accès non configuré.', { exact: true }).waitFor();
    await page.reload();
  }
  await page.locator('input[type=email]').fill(emailFor('qa-admin')); await page.locator('input[type=password]').fill('qa-admin');
  await page.locator('button[type=submit]').click();
  await page.getByText('Trop de tentatives. Réessayez dans 15 minutes.', { exact: true }).waitFor();
  assert.equal((await context.request.get(base + '/api/export/backup')).status(), 401);
  assert.deepEqual(errors, []);
  console.log('PASS mobile search/back navigation, portraits, recovery, backup, deletion retry, AI limits/errors, login throttling and roles; no page errors');
} finally { await browser?.close(); server.kill('SIGTERM'); await rm(dir, { recursive: true, force: true }); await rm(mediaDir, { recursive: true, force: true }); }
