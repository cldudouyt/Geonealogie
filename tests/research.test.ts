import { before, after, afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { NextRequest, NextResponse } from 'next/server';
import { decodeEntities, stripTags, nameVariants, maitronPageUrl, parseMaitronHtml, parseBnfRecords } from '../src/app/api/research/_parse';
import { researchRequest } from '../src/app/api/research/_shared';
import { GET as maitronGET } from '../src/app/api/research/maitron/route';
import { GET as wikidataGET } from '../src/app/api/research/wikidata/route';

let dir: string;
const realFetch = globalThis.fetch;
before(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'geo-research-'));
  process.env.GEO_DATA_DIR = dir;
  process.env.AUTH_SECRET = 'test-secret-research';
  delete process.env.DATABASE_URL; delete process.env.POSTGRES_URL;
});
after(async () => rm(dir, { recursive: true, force: true }));
afterEach(() => { globalThis.fetch = realFetch; });

let ip = 0;
const request = (query: string) => new NextRequest(`http://localhost/api/research/x?${query}`, { headers: { 'x-forwarded-for': `10.0.0.${++ip}` } });

test('entities are decoded, not dropped', () => {
  assert.equal(decodeEntities('l&#8217;usine &amp; Fils &lt;b&gt; &quot;x&quot; &apos;y&apos; &#x2014; &nbsp;'), 'l’usine & Fils <b> "x" \'y\' —  ');
  assert.equal(decodeEntities('&unknown; &#xD800;'), '&unknown; &#xD800;');
  assert.equal(stripTags('<p>Jean&#8217;s&nbsp;<b>life</b></p>'), 'Jean’s life');
});

test('name variants keep compound given names and surnames together and flag namesakes', () => {
  assert.deepEqual(nameVariants('jean marie, Louis', 'Dudouyt'), [
    { query: 'Jean Marie Dudouyt', namesake: false },
    { query: 'DUDOUYT Jean Marie', namesake: false },
    { query: 'Dudouyt', namesake: true },
  ]);
  const compound = nameVariants('Pierre', 'de La Tour');
  assert.equal(compound[0].query, 'Pierre de La Tour');
  assert.equal(compound[1].query, 'DE LA TOUR Pierre');
  assert.deepEqual(compound[2], { query: 'de La Tour', namesake: true });
  assert.deepEqual(nameVariants('', 'Dudouyt'), [{ query: 'Dudouyt', namesake: false }]);
  assert.deepEqual(nameVariants('', '', 'Jean Dudouyt'), [{ query: 'Jean Dudouyt', namesake: false }]);
});

test('maitron links: relative links become absolute, non-person pages rejected, &amp; decoded', () => {
  assert.equal(maitronPageUrl('/spip.php?article123&amp;lang=fr'), 'https://maitron.fr/spip.php?article123&lang=fr');
  assert.equal(maitronPageUrl('dudouyt-jean/'), 'https://maitron.fr/dudouyt-jean/');
  assert.equal(maitronPageUrl('http://www.maitron.fr/dudouyt-jean/'), 'https://www.maitron.fr/dudouyt-jean/');
  for (const bad of ['/?s=x', '/category/a/', '/#top', 'https://evil.example/maitron.fr/x', 'javascript:alert(1)', '/']) assert.equal(maitronPageUrl(bad), null, bad);
  const html = '<h2><a href="/dudouyt-jean/">DUDOUYT Jean&#8217;s</a></h2><p>Militant &amp; syndicaliste</p>';
  assert.deepEqual(parseMaitronHtml(html), [{ url: 'https://maitron.fr/dudouyt-jean/', title: 'DUDOUYT Jean’s', excerpt: 'Militant & syndicaliste' }]);
});

test('bnf records decode entities', () => {
  const xml = '<srw:recordData><dc:identifier>http://catalogue.bnf.fr/ark:/1&amp;2</dc:identifier><dc:title>L&apos;atelier &amp; la mine</dc:title><dc:creator>Dudouyt, Jean (1900-1980). Auteur</dc:creator><dc:date>1950</dc:date></srw:recordData>';
  assert.deepEqual(parseBnfRecords(xml), [{ url: 'http://catalogue.bnf.fr/ark:/1&2', title: 'L\'atelier & la mine', creator: 'Dudouyt, Jean', date: '1950' }]);
});

test('research queries are length-capped and rate limited', async () => {
  const long = await researchRequest(request('surname=' + 'a'.repeat(201)), 'test');
  assert.ok(long instanceof NextResponse);
  assert.equal(long.status, 400);
  const headers = { 'x-forwarded-for': '192.0.2.50' };
  for (let i = 0; i < 30; i++) assert.ok(!(await researchRequest(new NextRequest('http://localhost/x?q=Jean', { headers }), 'test') instanceof NextResponse));
  const limited = await researchRequest(new NextRequest('http://localhost/x?q=Jean', { headers }), 'test');
  assert.ok(limited instanceof NextResponse);
  assert.equal(limited.status, 429);
  assert.deepEqual((await limited.json()).results, []);
});

test('an unreachable source reports an error instead of an empty result', async () => {
  globalThis.fetch = async () => { throw new TypeError('network down'); };
  const maitron = await maitronGET(request('given=Jean&surname=Dudouyt'));
  assert.equal(maitron.status, 502);
  assert.ok((await maitron.json()).error);
  const wikidata = await wikidataGET(request('q=Jean%20Dudouyt'));
  assert.equal(wikidata.status, 502);
});

test('maitron searches variants in parallel and labels surname-only hits as namesakes', async () => {
  const seen: string[] = [];
  globalThis.fetch = (async (input: string | URL) => {
    const url = String(input);
    seen.push(url);
    if (url.includes('wp-json') && url.includes('search=Dudouyt&')) {
      return new Response(JSON.stringify([{ title: { rendered: 'DUDOUYT Paul' }, link: 'https://maitron.fr/dudouyt-paul/', excerpt: { rendered: 'Ouvrier' } }]), { status: 200 });
    }
    return new Response(url.includes('wp-json') ? '[]' : '<html></html>', { status: 200 });
  }) as typeof fetch;
  const res = await maitronGET(request('given=Jean&surname=Dudouyt'));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body.results, [{ title: 'DUDOUYT Paul', url: 'https://maitron.fr/dudouyt-paul/', excerpt: 'Ouvrier', namesake: true }]);
  assert.ok(seen.some(u => u.includes('search=Jean%20Dudouyt')));
  assert.ok(seen.some(u => u.includes('search=DUDOUYT%20Jean')));
});
