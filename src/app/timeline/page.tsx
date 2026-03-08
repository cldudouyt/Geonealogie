import Link from 'next/link';
import { getAllPersons, getSpouses } from '@/lib/gedcom-store';

interface TimelineEvent {
  year: number;
  type: 'naissance' | 'décès' | 'mariage' | 'événement';
  personId: string;
  personName: string;
  dateRaw?: string;
  place?: string;
  label?: string;
}

function extractYear(raw?: string): number | null {
  if (!raw) return null;
  const m = raw.match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
  return m ? parseInt(m[1]) : null;
}

export default async function TimelinePage() {
  const persons = await getAllPersons();
  const events: TimelineEvent[] = [];
  const marriageSeen = new Set<string>();

  for (const p of persons) {
    if (p.birthYear) {
      const year = parseInt(p.birthYear);
      if (!isNaN(year)) events.push({ year, type: 'naissance', personId: p.id, personName: p.displayName, dateRaw: p.birthDateRaw, place: p.birthPlace });
    }
    if (p.deathYear) {
      const year = parseInt(p.deathYear);
      if (!isNaN(year)) events.push({ year, type: 'décès', personId: p.id, personName: p.displayName, dateRaw: p.deathDateRaw, place: p.deathPlace });
    }
    for (const evt of p.events) {
      const year = extractYear(evt.dateRaw);
      if (year) events.push({ year, type: 'événement', personId: p.id, personName: p.displayName, dateRaw: evt.dateRaw, place: evt.place, label: evt.type });
    }
  }

  // Marriages (deduplicated)
  for (const p of persons) {
    const spouses = await getSpouses(p.id);
    for (const s of spouses) {
      const key = [p.id, s.familyId].sort().join('-');
      if (marriageSeen.has(key)) continue;
      marriageSeen.add(key);
      const year = extractYear(s.marriageDateRaw);
      if (year) {
        events.push({
          year, type: 'mariage',
          personId: p.id, personName: p.displayName,
          dateRaw: s.marriageDateRaw,
          place: s.marriagePlace,
          label: `Mariage avec ${s.person?.displayName ?? '?'}`,
        });
      }
    }
  }

  events.sort((a, b) => a.year - b.year || a.type.localeCompare(b.type));

  // Group by decade
  const byDecade: Record<number, TimelineEvent[]> = {};
  for (const e of events) {
    const decade = Math.floor(e.year / 10) * 10;
    (byDecade[decade] ??= []).push(e);
  }
  const decades = Object.keys(byDecade).map(Number).sort((a, b) => a - b);

  const typeColors: Record<string, string> = {
    naissance: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    décès: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
    mariage: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
    événement: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  };
  const typeDots: Record<string, string> = {
    naissance: 'bg-blue-400',
    décès: 'bg-slate-400',
    mariage: 'bg-pink-400',
    événement: 'bg-amber-400',
  };

  return (
    <div className="h-screen overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-primary hover:underline flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Arbre
            </Link>
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-200">Frise chronologique</h1>
          </div>
          <p className="text-sm text-slate-400">{events.length} événements</p>
        </div>
      </header>

      {/* Legend */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-2">
        <div className="max-w-3xl mx-auto flex flex-wrap gap-3">
          {(['naissance','mariage','décès','événement'] as const).map(type => (
            <span key={type} className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[type]}`}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </span>
          ))}
        </div>
      </div>

      <main className="max-w-3xl mx-auto p-6">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-16 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />

          <div className="space-y-8">
            {decades.map(decade => (
              <div key={decade}>
                {/* Decade label */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 text-right">
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500">{decade}s</span>
                  </div>
                  <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600 border-2 border-white dark:border-slate-950 z-10 relative" />
                </div>

                {/* Events */}
                <div className="space-y-2 pl-4">
                  {byDecade[decade].map((evt, i) => (
                    <div key={`${evt.personId}-${evt.type}-${evt.year}-${i}`} className="flex items-start gap-4">
                      {/* Year */}
                      <div className="w-12 text-right shrink-0 pt-0.5">
                        <span className="text-xs text-slate-400">{evt.year}</span>
                      </div>
                      {/* Dot */}
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 z-10 relative ${typeDots[evt.type]}`} />
                      {/* Content */}
                      <div className="flex-1 min-w-0 pb-2">
                        <div className="flex items-center flex-wrap gap-1.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${typeColors[evt.type]}`}>
                            {evt.label ?? evt.type}
                          </span>
                          <Link href={`/person/${evt.personId}`} className="text-sm font-medium hover:text-primary transition-colors truncate">
                            {evt.personName}
                          </Link>
                        </div>
                        {(evt.dateRaw || evt.place) && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {evt.dateRaw}{evt.dateRaw && evt.place && ' — '}{evt.place}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
