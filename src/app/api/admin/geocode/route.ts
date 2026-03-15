import { NextResponse } from 'next/server';
import { getAllPersons, clearStore } from '@/lib/gedcom-store';
import { geocodeSingle, getCached } from '@/lib/geocoder';
import { loadOverrides, savePersonEdit, type PersonEdit } from '@/lib/overrides-store';

export const maxDuration = 300; // 5 min timeout (Vercel Pro)

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

/** Geocode a place, honouring 1-req/sec Nominatim limit. */
async function resolvePlace(place: string, isFirst = false): Promise<{ lat: number; lon: number } | null> {
  const cached = getCached(place);
  if (cached !== undefined) return cached; // already in geocache (could be null = "not found")
  if (!isFirst) await sleep(1100); // Nominatim: max 1 req/sec; no delay before the very first call
  try {
    return await geocodeSingle(place);
  } catch (err) {
    console.error(`[geocode admin] geocodeSingle failed for "${place}":`, err);
    return null;
  }
}

export async function GET() {
  const [persons, overrides] = await Promise.all([getAllPersons(), loadOverrides()]);

  // GEDCOM places without coords
  const gedcomPlaces = new Set<string>();
  for (const p of persons) {
    if (p.birthPlaceFull && p.birthLat == null) gedcomPlaces.add(p.birthPlaceFull);
    if (p.deathPlaceFull && p.deathLat == null) gedcomPlaces.add(p.deathPlaceFull);
    for (const evt of p.events) {
      if (evt.lat == null) {
        const key = evt.placeFull || evt.place;
        if (key) gedcomPlaces.add(key);
      }
    }
  }

  // Override places without coords
  let overridePlaces = 0;
  for (const edit of Object.values(overrides.persons)) {
    if (edit.birthPlace && edit.birthLat == null) overridePlaces++;
    if (edit.deathPlace && edit.deathLat == null) overridePlaces++;
    for (const evt of edit.events ?? []) {
      if (evt.place && evt.lat == null) overridePlaces++;
    }
  }

  const uncachedGedcom = [...gedcomPlaces].filter(pl => getCached(pl) === undefined).length;

  return NextResponse.json({
    gedcomPlacesWithoutCoords: gedcomPlaces.size,
    gedcomUncached: uncachedGedcom,
    overridePlacesWithoutCoords: overridePlaces,
    total: uncachedGedcom + overridePlaces,
    estimatedMinutes: Math.ceil((uncachedGedcom + overridePlaces) * 1.1 / 60),
    hint: 'POST to /api/admin/geocode to run geocoding',
  });
}

export async function POST() {
  const [persons, overrides] = await Promise.all([getAllPersons(), loadOverrides()]);
  const log: string[] = [];
  let geocoded = 0;
  let idx = 0;

  // ── 1. Geocode GEDCOM places (stored in geocache.json if writable) ─────────
  const gedcomPlaces = new Set<string>();
  for (const p of persons) {
    if (p.birthPlaceFull && p.birthLat == null) gedcomPlaces.add(p.birthPlaceFull);
    if (p.deathPlaceFull && p.deathLat == null) gedcomPlaces.add(p.deathPlaceFull);
    for (const evt of p.events) {
      if (evt.lat == null) {
        const key = evt.placeFull || evt.place;
        if (key) gedcomPlaces.add(key);
      }
    }
  }

  for (const place of gedcomPlaces) {
    const cached = getCached(place);
    if (cached !== undefined) continue; // already resolved
    const isFirst = idx === 0;
    idx++;
    if (!isFirst) await sleep(1100);
    const result = await geocodeSingle(place);
    // geocodeSingle doesn't write to cache; we'll rely on overrides path below
    const entry = `[GEDCOM ${idx}] ${place} → ${result ? `${result.lat.toFixed(4)},${result.lon.toFixed(4)}` : 'non trouvé'}`;
    log.push(entry);
    if (result) geocoded++;
    console.log(entry);
  }

  // ── 2. Geocode override events/birth/death → persist coords in Neo4j ───────
  for (const [personId, edit] of Object.entries(overrides.persons)) {
    const updated: PersonEdit = {};
    let changed = false;

    // Birth place
    if (edit.birthPlace && edit.birthLat == null) {
      const result = await resolvePlace(edit.birthPlace, idx++ === 0);
      const entry = `[OVR birth ${personId}] ${edit.birthPlace} → ${result ? `${result.lat.toFixed(4)},${result.lon.toFixed(4)}` : 'non trouvé'}`;
      log.push(entry);
      console.log(entry);
      if (result) {
        updated.birthLat = result.lat;
        updated.birthLon = result.lon;
        geocoded++;
        changed = true;
      }
    }

    // Death place
    if (edit.deathPlace && edit.deathLat == null) {
      const result = await resolvePlace(edit.deathPlace, idx++ === 0);
      const entry = `[OVR death ${personId}] ${edit.deathPlace} → ${result ? `${result.lat.toFixed(4)},${result.lon.toFixed(4)}` : 'non trouvé'}`;
      log.push(entry);
      console.log(entry);
      if (result) {
        updated.deathLat = result.lat;
        updated.deathLon = result.lon;
        geocoded++;
        changed = true;
      }
    }

    // Events
    if (edit.events) {
      const updatedEvents = [...edit.events];
      for (let i = 0; i < updatedEvents.length; i++) {
        const evt = updatedEvents[i];
        if (!evt.place || evt.lat != null) continue;
        const result = await resolvePlace(evt.place, idx++ === 0);
        const entry = `[OVR evt ${personId}/${evt.type}] ${evt.place} → ${result ? `${result.lat.toFixed(4)},${result.lon.toFixed(4)}` : 'non trouvé'}`;
        log.push(entry);
        console.log(entry);
        if (result) {
          updatedEvents[i] = { ...evt, lat: result.lat, lon: result.lon };
          geocoded++;
          changed = true;
        }
      }
      if (changed) updated.events = updatedEvents;
    }

    if (changed) {
      await savePersonEdit(personId, updated);
    }
  }

  clearStore();

  return NextResponse.json({ geocoded, totalAttempted: idx, log });
}
