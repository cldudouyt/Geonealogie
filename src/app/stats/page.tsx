import Link from 'next/link';
import { getAllPersons } from '@/lib/gedcom-store';

function top<T extends string>(arr: T[], n = 10): { value: T; count: number }[] {
  const counts = new Map<T, number>();
  for (const v of arr) {
    if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([value, count]) => ({ value, count }));
}

function Bar({ count, max, color }: { count: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default async function StatsPage() {
  const persons = await getAllPersons();

  // ── Lifespan ───────────────────────────────────────────────────────────────
  const withDates = persons.filter(p => p.birthYear && p.deathYear);
  const lifespans = withDates.map(p => parseInt(p.deathYear!) - parseInt(p.birthYear!)).filter(n => n > 0 && n < 120);
  const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
  const avgAll = avg(lifespans);
  const avgM = avg(lifespans.filter((_, i) => withDates[i].sex === 'M'));
  const avgF = avg(lifespans.filter((_, i) => withDates[i].sex === 'F'));

  // ── Years range ────────────────────────────────────────────────────────────
  const years = persons.map(p => p.birthYear ? parseInt(p.birthYear) : null).filter(Boolean) as number[];
  const minYear = years.length ? Math.min(...years) : null;
  const maxYear = years.length ? Math.max(...years) : null;

  // ── Births by century ──────────────────────────────────────────────────────
  const centuryMap = new Map<number, number>();
  for (const y of years) {
    const c = Math.floor(y / 100) * 100;
    centuryMap.set(c, (centuryMap.get(c) ?? 0) + 1);
  }
  const centuries = [...centuryMap.entries()].sort((a, b) => a[0] - b[0]);
  const maxCenturyCount = Math.max(...centuries.map(([, n]) => n));

  // ── Top professions ────────────────────────────────────────────────────────
  const topOccupations = top(persons.map(p => p.occupation).filter(Boolean) as string[]);
  const maxOcc = topOccupations[0]?.count ?? 1;

  // ── Top firstnames ─────────────────────────────────────────────────────────
  const firstnames = persons.map(p => p.givenNames.split(/[\s,]+/)[0]).filter(Boolean);
  const topFirstnames = top(firstnames);
  const maxFn = topFirstnames[0]?.count ?? 1;

  // ── Top surnames ───────────────────────────────────────────────────────────
  const topSurnames = top(persons.map(p => p.surname).filter(Boolean));
  const maxSn = topSurnames[0]?.count ?? 1;

  // ── Sex distribution ───────────────────────────────────────────────────────
  const maleCount = persons.filter(p => p.sex === 'M').length;
  const femaleCount = persons.filter(p => p.sex === 'F').length;
  const unknownCount = persons.filter(p => p.sex === 'U').length;

  // ── Geographic: extract country from birthPlaceFull ────────────────────────
  const countries = persons
    .map(p => {
      const parts = (p.birthPlaceFull || '').split(',').map(s => s.trim());
      return parts[4] || parts[3] || null;
    })
    .filter(Boolean) as string[];
  const topCountries = top(countries);
  const maxCountry = topCountries[0]?.count ?? 1;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link href="/" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Accueil
          </Link>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Statistiques</h1>
          <a
            href="/api/export/csv"
            download="genealogie.csv"
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exporter CSV
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6">

        {/* Key figures */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Personnes', value: persons.length, color: 'text-blue-600' },
            { label: 'Période', value: minYear && maxYear ? `${minYear}–${maxYear}` : '—', color: 'text-slate-700 dark:text-slate-300' },
            { label: 'Espérance de vie', value: avgAll ? `${avgAll} ans` : '—', color: 'text-emerald-600' },
            { label: 'Professions', value: topOccupations.length, color: 'text-violet-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm text-center">
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-slate-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Sex + lifespan */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm">
            <h2 className="font-semibold text-slate-700 dark:text-slate-300 mb-4">Répartition par sexe</h2>
            <div className="space-y-3">
              {[
                { label: 'Hommes', count: maleCount, color: 'bg-blue-500', text: 'text-blue-600' },
                { label: 'Femmes', count: femaleCount, color: 'bg-pink-500', text: 'text-pink-600' },
                { label: 'Inconnu', count: unknownCount, color: 'bg-slate-400', text: 'text-slate-500' },
              ].map(({ label, count, color, text }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="w-16 text-sm text-slate-600 dark:text-slate-400 shrink-0">{label}</span>
                  <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.round(count / persons.length * 100)}%` }} />
                  </div>
                  <span className={`text-sm font-medium w-10 text-right ${text}`}>{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm">
            <h2 className="font-semibold text-slate-700 dark:text-slate-300 mb-4">Espérance de vie ({lifespans.length} personnes)</h2>
            <div className="space-y-3">
              {[
                { label: 'Globale', value: avgAll, color: 'text-emerald-600' },
                { label: 'Hommes', value: avgM, color: 'text-blue-600' },
                { label: 'Femmes', value: avgF, color: 'text-pink-600' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
                  <span className={`text-2xl font-bold ${color}`}>{value ? `${value} ans` : '—'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Births by century */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-slate-700 dark:text-slate-300 mb-5">Naissances par siècle</h2>
          <div className="flex items-end gap-2 h-32">
            {centuries.map(([century, count]) => (
              <div key={century} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-slate-400">{count}</span>
                <div
                  className="w-full bg-primary/80 rounded-t"
                  style={{ height: `${Math.round((count / maxCenturyCount) * 100)}%`, minHeight: 4 }}
                />
                <span className="text-xs text-slate-500 rotate-0 whitespace-nowrap">{century}s</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top professions + firstnames */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm">
            <h2 className="font-semibold text-slate-700 dark:text-slate-300 mb-4">Top professions</h2>
            {topOccupations.length === 0 ? <p className="text-sm text-slate-400">Aucune donnée</p> : (
              <ul className="space-y-2">
                {topOccupations.map(({ value, count }) => (
                  <li key={value} className="flex items-center gap-3">
                    <span className="text-sm text-slate-700 dark:text-slate-300 flex-1 truncate">{value}</span>
                    <Bar count={count} max={maxOcc} color="bg-violet-400" />
                    <span className="text-sm font-medium text-slate-500 w-8 text-right">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm">
            <h2 className="font-semibold text-slate-700 dark:text-slate-300 mb-4">Top prénoms</h2>
            <ul className="space-y-2">
              {topFirstnames.map(({ value, count }) => (
                <li key={value} className="flex items-center gap-3">
                  <span className="text-sm text-slate-700 dark:text-slate-300 w-24 truncate">{value}</span>
                  <Bar count={count} max={maxFn} color="bg-amber-400" />
                  <span className="text-sm font-medium text-slate-500 w-8 text-right">{count}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Top surnames + countries */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm">
            <h2 className="font-semibold text-slate-700 dark:text-slate-300 mb-4">Top noms de famille</h2>
            <ul className="space-y-2">
              {topSurnames.map(({ value, count }) => (
                <li key={value} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 w-32 truncate">{value}</span>
                  <Bar count={count} max={maxSn} color="bg-blue-400" />
                  <span className="text-sm font-medium text-slate-500 w-8 text-right">{count}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm">
            <h2 className="font-semibold text-slate-700 dark:text-slate-300 mb-4">Pays d'origine</h2>
            {topCountries.length === 0 ? <p className="text-sm text-slate-400">Aucune donnée géographique</p> : (
              <ul className="space-y-2">
                {topCountries.map(({ value, count }) => (
                  <li key={value} className="flex items-center gap-3">
                    <span className="text-sm text-slate-700 dark:text-slate-300 w-24 truncate">{value}</span>
                    <Bar count={count} max={maxCountry} color="bg-emerald-400" />
                    <span className="text-sm font-medium text-slate-500 w-8 text-right">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
