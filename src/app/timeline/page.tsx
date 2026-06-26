import { Suspense } from 'react';
import { getPerson, searchPersons } from '@/lib/gedcom-store';
import TimelineClient, { type JourneyStop } from '@/components/timeline/TimelineClient';

export const metadata = { title: 'Parcours migratoire — Géonéalogie' };

const DEFAULT_PERSON_QUERY = 'Jean Dudouyt';

const EVENT_TYPE_FR: Record<string, string> = {
  'Military service': 'Service militaire',
  'Honors': 'Distinctions',
  'Religious marriage': 'Mariage religieux',
  'Residence': 'Résidence',
  'Title': 'Titre',
  'Travel': 'Voyage',
  'Post mortem': 'Post mortem',
};

function translateEventType(type: string): string {
  return EVENT_TYPE_FR[type] ?? type;
}

async function resolveDefaultPersonId(): Promise<string> {
  const results = await searchPersons(DEFAULT_PERSON_QUERY, 5);
  return results[0]?.id ?? '';
}

function mapStops(raw: Array<{
  type: string; label: string; dateRaw?: string;
  place?: string; lat: number | null; lon: number | null;
}>): JourneyStop[] {
  return raw
    .filter(s => s.place)
    .map(s => ({
      type: (s.type as JourneyStop['type']) || 'event',
      label: s.label,
      dateRaw: s.dateRaw,
      place: s.place,
      lat: s.lat,
      lon: s.lon,
    }));
}

async function fetchJourneyStops(personId: string): Promise<JourneyStop[]> {
  const person = await getPerson(personId);
  if (!person) return [];

  const stops: Array<{
    type: string; label: string; dateRaw?: string;
    place?: string; lat: number | null; lon: number | null;
  }> = [];

  if (person.birthDateRaw || person.birthPlaceFull || person.birthPlace) {
    stops.push({
      type: 'birth',
      label: 'Naissance',
      dateRaw: person.birthDateRaw,
      place: person.birthPlaceFull || person.birthPlace,
      lat: typeof person.birthLat === 'number' ? person.birthLat : null,
      lon: typeof person.birthLon === 'number' ? person.birthLon : null,
    });
  }

  const occupationSet = new Set(person.occupations.map(o => o.toLowerCase()));
  for (const evt of person.events) {
    if (evt.dateRaw || evt.place || evt.placeFull) {
      const isOccu = occupationSet.has(evt.type.toLowerCase());
      stops.push({
        type: isOccu ? 'special' : 'event',
        label: translateEventType(evt.type),
        dateRaw: evt.dateRaw,
        place: evt.placeFull || evt.place,
        lat: typeof evt.lat === 'number' ? evt.lat : null,
        lon: typeof evt.lon === 'number' ? evt.lon : null,
      });
    }
  }

  if (person.deathDateRaw || person.deathPlaceFull || person.deathPlace) {
    stops.push({
      type: 'death',
      label: 'Décès',
      dateRaw: person.deathDateRaw,
      place: person.deathPlaceFull || person.deathPlace,
      lat: typeof person.deathLat === 'number' ? person.deathLat : null,
      lon: typeof person.deathLon === 'number' ? person.deathLon : null,
    });
  }

  function extractYear(d?: string) {
    if (!d) return 9999;
    const m = d.match(/\b(\d{4})\b/);
    return m ? parseInt(m[1]) : 9999;
  }
  const TYPE_ORDER: Record<string, number> = { birth: -1, event: 0, special: 0, death: 1 };
  stops.sort((a, b) => {
    const diff = extractYear(a.dateRaw) - extractYear(b.dateRaw);
    return diff !== 0 ? diff : (TYPE_ORDER[a.type] ?? 0) - (TYPE_ORDER[b.type] ?? 0);
  });

  return mapStops(stops);
}

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const { focus } = await searchParams;

  const personId = focus || (await resolveDefaultPersonId());
  const person = personId ? await getPerson(personId) : null;
  const personName = person?.displayName ?? DEFAULT_PERSON_QUERY;

  const initialStops = personId ? await fetchJourneyStops(personId) : [];

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen" style={{ background: '#f4f1ea', color: '#9a9080' }}>
        Chargement…
      </div>
    }>
      <TimelineClient
        initialStops={initialStops}
        initialPersonName={personName}
        initialPersonId={personId}
      />
    </Suspense>
  );
}
