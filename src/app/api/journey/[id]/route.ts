import { getPerson } from '@/lib/gedcom-store';
import { NextResponse } from 'next/server';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const person = await getPerson(id);
  if (!person) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const stops: Array<{
    type: string; label: string; dateRaw?: string;
    place?: string; lat: number | null; lon: number | null;
  }> = [];

  if (person.birthDateRaw || person.birthPlaceFull || person.birthPlace) {
    stops.push({
      type: 'birth', label: 'Naissance',
      dateRaw: person.birthDateRaw,
      place: person.birthPlaceFull || person.birthPlace,
      lat: typeof person.birthLat === 'number' ? person.birthLat : null,
      lon: typeof person.birthLon === 'number' ? person.birthLon : null,
    });
  }
  for (const evt of person.events) {
    if (evt.dateRaw || evt.place || evt.placeFull) {
      stops.push({
        type: 'event', label: evt.type,
        dateRaw: evt.dateRaw,
        place: evt.placeFull || evt.place,
        lat: typeof evt.lat === 'number' ? evt.lat : null,
        lon: typeof evt.lon === 'number' ? evt.lon : null,
      });
    }
  }
  if (person.deathDateRaw || person.deathPlaceFull || person.deathPlace) {
    stops.push({
      type: 'death', label: 'Décès',
      dateRaw: person.deathDateRaw,
      place: person.deathPlaceFull || person.deathPlace,
      lat: typeof person.deathLat === 'number' ? person.deathLat : null,
      lon: typeof person.deathLon === 'number' ? person.deathLon : null,
    });
  }
  if (person.burialDateRaw || person.burialPlace) {
    stops.push({
      type: 'burial', label: 'Inhumation',
      dateRaw: person.burialDateRaw,
      place: person.burialPlace,
      lat: null, lon: null,
    });
  }

  // Sort chronologically
  function extractYear(d?: string) {
    if (!d) return 9999;
    const m = d.match(/\b(\d{4})\b/);
    return m ? parseInt(m[1]) : 9999;
  }
  const TYPE_ORDER: Record<string, number> = { birth: -1, event: 0, death: 1, burial: 2 };
  stops.sort((a, b) => {
    const diff = extractYear(a.dateRaw) - extractYear(b.dateRaw);
    return diff !== 0 ? diff : (TYPE_ORDER[a.type] ?? 0) - (TYPE_ORDER[b.type] ?? 0);
  });

  return NextResponse.json(stops);
}
