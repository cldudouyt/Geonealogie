import { getPerson } from '@/lib/gedcom-store';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') || '50';
  const person = await getPerson(id);
  if (!person) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // Mirror exactly what page.tsx builds
  const journeyStops: Array<{
    type: string; label: string; dateRaw?: string;
    place?: string; lat: number | null; lon: number | null;
  }> = [];

  if (person.birthDateRaw || person.birthPlaceFull || person.birthPlace) {
    journeyStops.push({
      type: 'birth', label: 'Naissance',
      dateRaw: person.birthDateRaw,
      place: person.birthPlaceFull || person.birthPlace,
      lat: person.birthLat != null ? Number(person.birthLat) : null,
      lon: person.birthLon != null ? Number(person.birthLon) : null,
    });
  }
  for (const evt of person.events) {
    if (evt.dateRaw || evt.place || evt.placeFull) {
      journeyStops.push({
        type: 'event', label: evt.type,
        dateRaw: evt.dateRaw,
        place: evt.placeFull || evt.place,
        lat: evt.lat != null ? Number(evt.lat) : null,
        lon: evt.lon != null ? Number(evt.lon) : null,
      });
    }
  }

  const stopsWithCoords = journeyStops.filter(s => s.lat != null && s.lon != null);

  return NextResponse.json({
    total: journeyStops.length,
    withCoords: stopsWithCoords.length,
    stops: journeyStops.map(s => ({
      label: s.label, lat: s.lat, lon: s.lon, latType: typeof s.lat, lonType: typeof s.lon,
    })),
    rawEvents: person.events.map(e => ({
      type: e.type, place: e.place, placeFull: e.placeFull,
      lat: e.lat, lon: e.lon, latType: typeof e.lat,
    })),
  });
}
