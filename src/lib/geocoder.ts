/**
 * Geocoder using Nominatim (OpenStreetMap).
 * Results are cached in data/geocache.json to avoid repeated API calls.
 * Rate limit: 1 request per second (Nominatim policy).
 */
import fs from 'fs';
import path from 'path';

export interface GeoPoint { lat: number; lon: number; }
type GeoCache = Record<string, GeoPoint | null>;

const CACHE_PATH = path.resolve(process.cwd(), 'data/geocache.json');
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'Geonealogie/1.0 (genealogy app)';

let cache: GeoCache | null = null;

function loadCache(): GeoCache {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
  } catch {
    cache = {};
  }
  return cache!;
}

function saveCache(c: GeoCache): void {
  try {
    fs.writeFileSync(CACHE_PATH, JSON.stringify(c, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[Geocoder] Cannot write cache (read-only filesystem):', e);
  }
}

/** Retrieve cached coordinate for a place (undefined = not cached yet, null = tried & not found) */
export function getCached(place: string): GeoPoint | null | undefined {
  const c = loadCache();
  if (place in c) return c[place];
  return undefined;
}

/** Apply coordinates from cache to place names, returns Map<placeName, GeoPoint|null> */
export function applyGeoCache(placeNames: string[]): Map<string, GeoPoint | null> {
  const c = loadCache();
  const result = new Map<string, GeoPoint | null>();
  for (const name of placeNames) {
    if (name in c) result.set(name, c[name]);
  }
  return result;
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function geocodeSingle(place: string): Promise<GeoPoint | null> {
  try {
    const params = new URLSearchParams({ q: place, format: 'json', limit: '1' });
    const res = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) return null;
    const data = await res.json() as Array<{ lat: string; lon: string }>;
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

/**
 * Geocode a list of place names, skipping already-cached ones.
 * Calls onProgress after each request.
 * Returns the number of new results added.
 */
export async function geocodePlaces(
  places: string[],
  onProgress?: (done: number, total: number, place: string, result: GeoPoint | null) => void,
): Promise<number> {
  const c = loadCache();
  const toGeocode = places.filter(p => p && !(p in c));
  const unique = [...new Set(toGeocode)];

  let added = 0;
  for (let i = 0; i < unique.length; i++) {
    const place = unique[i];
    const result = await geocodeSingle(place);
    c[place] = result;
    if (result) added++;
    saveCache(c);
    onProgress?.(i + 1, unique.length, place, result);
    if (i < unique.length - 1) await sleep(1100); // Nominatim: max 1 req/sec
  }
  return added;
}
