import { NextResponse } from 'next/server';
import { getAllPersons } from '@/lib/gedcom-store';
import { geocodePlaces, getCached } from '@/lib/geocoder';
import { clearStore } from '@/lib/gedcom-store';

export const maxDuration = 300; // 5 min timeout (Vercel Pro)

export async function GET() {
  const persons = await getAllPersons();

  const placeNames = new Set<string>();
  for (const p of persons) {
    if (p.birthPlaceFull && p.birthLat == null) placeNames.add(p.birthPlaceFull);
    if (p.deathPlaceFull && p.deathLat == null) placeNames.add(p.deathPlaceFull);
    for (const evt of p.events) {
      if (evt.placeFull && evt.lat == null) placeNames.add(evt.placeFull);
    }
  }

  const uncached = [...placeNames].filter(pl => getCached(pl) === undefined);

  return NextResponse.json({
    totalPlacesWithoutCoords: placeNames.size,
    alreadyCached: placeNames.size - uncached.length,
    toGeocode: uncached.length,
    message: uncached.length === 0
      ? 'All places already cached. POST to /api/admin/geocode to force refresh.'
      : `POST to /api/admin/geocode to geocode ${uncached.length} new places (≈${Math.ceil(uncached.length * 1.1 / 60)} min).`,
  });
}

export async function POST() {
  const persons = await getAllPersons();

  const placeNames = new Set<string>();
  for (const p of persons) {
    if (p.birthPlaceFull && p.birthLat == null) placeNames.add(p.birthPlaceFull);
    if (p.deathPlaceFull && p.deathLat == null) placeNames.add(p.deathPlaceFull);
    for (const evt of p.events) {
      if (evt.placeFull && evt.lat == null) placeNames.add(evt.placeFull);
    }
  }

  const log: string[] = [];
  const added = await geocodePlaces([...placeNames], (done, total, place, result) => {
    log.push(`[${done}/${total}] ${place} → ${result ? `${result.lat},${result.lon}` : 'not found'}`);
    if (log.length % 10 === 0) console.log(log[log.length - 1]);
  });

  // Clear store so next request rebuilds with new coordinates
  clearStore();

  return NextResponse.json({ geocoded: added, total: placeNames.size, log });
}
