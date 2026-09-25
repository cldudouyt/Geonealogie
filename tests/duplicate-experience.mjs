import { chromium } from 'playwright';
import { readGedcom } from 'read-gedcom';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
const dir = await mkdtemp(path.join(os.tmpdir(), 'geo-experience-'));
const data = JSON.parse(await readFile('data/overrides.json', 'utf8'));
data.newPersons.push({ id: 'qa-first', givenNames: 'Camille', surname: 'TESTEXPERIENCE', sex: 'U', birthDateRaw: '1 JAN 1900', notes: 'Première fiche' }, { id: 'qa-second', givenNames: 'Camille', surname: 'TESTEXPERIENCE', sex: 'U', birthDateRaw: '1 JAN 1900', notes: 'Seconde fiche' });
for (const id of ['qa-parent-one','qa-parent-two']) data.newPersons.push({id,givenNames:'Parent',surname:id,sex:'U'});
for (const id of ['qa-batch-one','qa-batch-two']) data.newPersons.push({id,givenNames:'Louise Jeanne',surname:'TESTLOT',sex:'F',birthDateRaw:'1 JAN 1900',birthPlace:'Nantes',relations:[{relType:'child',relPersonId:'qa-parent-one'},{relType:'child',relPersonId:'qa-parent-two'}]});
await writeFile(path.join(dir, 'overrides.json'), JSON.stringify(data));
const port = 3097; const base = `http://localhost:${port}`;
const emailFor = p => ({"qa-admin":"admin@qa.local","qa-reader":"reader@qa.local","qa-contributor":"contributor@qa.local"})[p] ?? "admin@qa.local";
const env = { ...process.env, AUTH_PASSWORD: 'qa-admin', AUTH_ADMIN_EMAIL: 'admin@qa.local', AUTH_SECRET: 'qa-only-local-secret', GEO_DATA_DIR: dir, AUTH_USERS_JSON: JSON.stringify([{ name: 'Lecture QA', role: 'reader', password: 'qa-reader', email: 'reader@qa.local' },{ name: 'Contribution QA', role: 'contributor', password: 'qa-contributor', email: 'contributor@qa.local' }]) };
delete env.DATABASE_URL; delete env.POSTGRES_URL; delete env.VERCEL;
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)], { env, stdio: ['ignore', 'pipe', 'pipe'] });
let log = ''; server.stdout.on('data', b => log += b); server.stderr.on('data', b => log += b);
let browser;
try {
  for (let i=0; i<120; i++) { try { if ((await fetch(base+'/login')).ok) break; } catch {} if(i===119) throw new Error('Server did not start: '+log); await new Promise(r=>setTimeout(r,250)); }
  browser = await chromium.launch({headless:true, executablePath:process.env.QA_CHROMIUM || undefined, args: process.env.QA_CHROMIUM_ARGS ? JSON.parse(process.env.QA_CHROMIUM_ARGS) : undefined });
  const context = await browser.newContext({ viewport:{width:390,height:844} });
  await context.route(/https?:\/\/(?!localhost)/, r => r.abort());
  const page = await context.newPage(); page.setDefaultTimeout(15000); page.setDefaultNavigationTimeout(20000); const errors=[]; page.on('pageerror', e=>{errors.push(e.message);console.error('BROWSER ERROR', e.stack);});
  for(const route of ['/api/admin/debug-person','/api/admin/debug-journey','/api/journey/69','/api/persons']) assert.equal((await context.request.get(base+route)).status(),401,route);
  console.log('PASS anonymous data routes protected');
  await page.goto(base+'/login'); await page.locator('input[type=email]').fill(emailFor('qa-admin')); await page.locator('input[type=password]').fill('qa-admin'); await page.locator('button[type=submit]').click(); await page.waitForURL(base+'/');
  const noOverflow = async () => assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth));
  await mkdir('/tmp/geonealogie-screens',{recursive:true});
  await page.goto(base+'/doublons');
  await page.getByRole('button',{name:'Analyser les doublons',exact:true}).click();
  const batchBox=page.getByRole('checkbox',{name:/Louise Jeanne.*TESTLOT/});
  await batchBox.check();
  await noOverflow();
  await page.screenshot({path:'/tmp/geonealogie-screens/batch-mobile.png'});
  await page.getByRole('button',{name:'Vérifier la sélection (1)',exact:true}).click();
  await page.getByRole('button',{name:'Confirmer les 1 fusions',exact:true}).click();
  await page.getByRole('status').filter({hasText:'1 paire(s) fusionnée(s).'}).waitFor();
  assert.equal((await context.request.get(base+'/api/persons/qa-batch-two')).status(),404);
  await page.goto(base+'/history');
  await page.getByText('Annuler cette modification',{exact:true}).click();
  await page.getByRole('button',{name:'Confirmer la restauration'}).click();
  await page.getByText('Restauration effectuée.',{exact:true}).waitFor();
  assert.equal((await context.request.get(base+'/api/persons/qa-batch-two')).status(),200);
  console.log('PASS batch analysis, selection, confirmation and full restoration');

  await browser.close();
  browser = await chromium.launch({headless:true, executablePath:process.env.QA_CHROMIUM || undefined, args:process.env.QA_CHROMIUM_ARGS ? JSON.parse(process.env.QA_CHROMIUM_ARGS) : undefined});
  const reader = await browser.newContext({viewport:{width:390,height:844}}); await reader.route(/https?:\/\/(?!localhost)/, r => r.abort()); const rp=await reader.newPage(); rp.setDefaultTimeout(15000); rp.setDefaultNavigationTimeout(20000); await rp.goto(base+'/login'); await rp.locator('input[type=email]').fill(emailFor('qa-reader')); await rp.locator('input[type=password]').fill('qa-reader'); await rp.locator('button[type=submit]').click(); await rp.waitForURL(base+'/');
  assert.equal((await reader.request.get(base+'/history')).status(),403); assert.equal((await reader.request.post(base+'/api/admin/clear-cache')).status(),403); assert.equal((await reader.request.get(base+'/person/qa-first/edit')).status(),403);
  await rp.goto(base+'/person/qa-first'); await rp.getByRole('tab',{name:'Sources',exact:true}).click(); assert.equal(await rp.getByText('Ajouter une source',{exact:true}).count(),0);
  await rp.getByRole('button',{name:'Plus',exact:true}).click(); await rp.getByRole('button',{name:'Se déconnecter'}).click(); await rp.waitForURL(base+'/login');
  await reader.close();
  assert.deepEqual(errors,[]); console.log('PASS read-only access, logout, no browser errors');
} catch(e) { console.error(log.slice(-3500)); throw e; }
finally { await browser?.close(); server.kill(); await rm(dir,{recursive:true,force:true}); }
