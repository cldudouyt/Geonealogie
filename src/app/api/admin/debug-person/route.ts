import { getPerson } from '@/lib/gedcom-store';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') || '69';
  const person = await getPerson(id);
  if (!person) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({
    id: person.id,
    displayName: person.displayName,
    birthDateRaw: person.birthDateRaw,
    birthPlace: person.birthPlace,
    birthPlaceFull: person.birthPlaceFull,
    birthLat: person.birthLat,
    birthLon: person.birthLon,
    deathDateRaw: person.deathDateRaw,
    deathPlace: person.deathPlace,
    deathPlaceFull: person.deathPlaceFull,
    deathLat: person.deathLat,
    deathLon: person.deathLon,
    burialPlace: person.burialPlace,
    burialDateRaw: person.burialDateRaw,
    events: person.events,
    notes: person.notes,
  });
}
