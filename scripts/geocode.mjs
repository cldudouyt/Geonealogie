/**
 * Geocode all places from the GEDCOM that have no coordinates.
 * Run with: node scripts/geocode.mjs
 * Requires the dev server to be running OR Next.js env to be loaded.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readGedcom } from 'read-gedcom';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CACHE_PATH = path.join(ROOT, 'data', 'geocache.json');
const GEDCOM_PATH = path.join(ROOT, 'Dudouyt Heredis 2014-Export.ged');
const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'Geonealogie/1.0 (genealogy app)';

function getVal(node) {
  try {
    const v = node?.value();
    if (Array.isArray(v)) return v[0]?.toString() || undefined;
    return v?.toString() || undefined;
  } catch { return undefined; }
}

function parseCoord(str) {
  if (!str) return undefined;
  const dir = str.charAt(0);
  const val = parseFloat(str.substring(1));
  if (isNaN(val)) return undefined;
  return val * (dir === 'S' || dir === 'W' ? -1 : 1);
}

function loadCache() {
  try { return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8')); }
  catch { return {}; }
}

function saveCache(c) {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(c, null, 2), 'utf-8');
}

async function geocodeSingle(place) {
  try {
    const params = new URLSearchParams({ q: place, format: 'json', limit: '1' });
    const res = await fetch(`${NOMINATIM}?${params}`, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch (e) {
    console.error('  fetch error:', e.message);
    return null;
  }
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// --- Main ---
console.log('Reading GEDCOM…');
const fileBuffer = fs.readFileSync(GEDCOM_PATH);
const arrayBuffer = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength);
const gedcom = readGedcom(arrayBuffer);

const placeSet = new Set();
const individuals = gedcom.getIndividualRecord().arraySelect();
for (const indi of individuals) {
  const birth = indi.getEventBirth();
  const death = indi.getEventDeath();

  const birthPlace = getVal(birth?.getPlace());
  const deathPlace = getVal(death?.getPlace());

  if (birthPlace) {
    const map = birth?.getPlace()?.get('MAP');
    const lat = parseCoord(getVal(map?.get('LATI')));
    if (lat == null) placeSet.add(birthPlace);
  }
  if (deathPlace) {
    const map = death?.getPlace()?.get('MAP');
    const lat = parseCoord(getVal(map?.get('LATI')));
    if (lat == null) placeSet.add(deathPlace);
  }
}

const cache = loadCache();
const places = [...placeSet].filter(p => !(p in cache));

console.log(`${placeSet.size} places without GEDCOM coords, ${places.length} not yet cached.`);
if (places.length === 0) {
  console.log('Nothing to do. Cache is up to date.');
  process.exit(0);
}

console.log(`Starting geocoding (1 req/sec, ~${Math.ceil(places.length * 1.1 / 60)} min)…\n`);
let found = 0;
for (let i = 0; i < places.length; i++) {
  const place = places[i];
  const result = await geocodeSingle(place);
  cache[place] = result;
  if (result) found++;
  saveCache(cache);
  const pct = Math.round((i + 1) / places.length * 100);
  process.stdout.write(`\r[${i + 1}/${places.length}] ${pct}% — ${place.substring(0, 50).padEnd(50)} ${result ? '✓' : '✗'}`);
  if (i < places.length - 1) await sleep(1100);
}

console.log(`\n\nDone! ${found}/${places.length} places geocoded. Cache saved to data/geocache.json`);
console.log('Restart your dev server (or redeploy) for changes to take effect.');
