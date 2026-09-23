import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { NextRequest } from 'next/server';
import { GET } from '../src/app/api/persons/route';
import { parseDayMonth, normalizeDate } from '../src/lib/gedcom/date-normalizer';
import { csvCell } from '../src/lib/csv';
let dir: string;
before(async () => { dir = await mkdtemp(path.join(os.tmpdir(), 'geo-search-')); process.env.GEO_DATA_DIR = dir; process.env.GEDCOM_PATH = path.resolve('tests/fixtures/sample.ged'); delete process.env.DATABASE_URL; delete process.env.POSTGRES_URL; delete process.env.VERCEL; });
after(async () => rm(dir, { recursive: true, force: true }));
test('query and advanced filters are applied together', async () => {
  const response = await GET(new NextRequest('http://localhost/api/persons?q=DUDOUYT&sex=F&birthFrom=1950'));
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.ok(result.total > 0);
  for (const person of result.persons) { assert.equal(person.sex, 'F'); assert.ok(Number(person.birthYear) >= 1950); }
});
test('malformed pagination and inverted date ranges are rejected', async () => {
  for (const query of ['page=0','page=-1','page=hello','limit=-3','limit=NaN','birthFrom=2000&birthTo=1900']) assert.equal((await GET(new NextRequest(`http://localhost/api/persons?${query}`))).status, 400);
});
test('calendar parsing preserves exactness and rejects unknown months', () => {
  assert.equal(normalizeDate('XYZ 1900'), undefined);
  assert.equal(normalizeDate('1 JAN 0001'), '0001-01-01');
  assert.equal(normalizeDate('jun 1900'), '1900-06');
  for (const value of ['31 APR 1900','29 FEB 1900','BEF 1 JAN 1900','ABT 1 JAN 1900','BET 1 JAN 1900 AND 2 JAN 1900']) assert.equal(parseDayMonth(value), null);
  assert.deepEqual(parseDayMonth('29 FEB 2000'), { day: 29, month: 2 });
});
test('CSV quotes carriage returns and neutralizes spreadsheet formulas', () => {
  assert.equal(csvCell('=1+1'), "'=1+1"); assert.equal(csvCell(' @SUM(A1)'), "' @SUM(A1)");
  assert.equal(csvCell('a\rb'), '"a\rb"'); assert.equal(csvCell('Jean'), 'Jean');
});
