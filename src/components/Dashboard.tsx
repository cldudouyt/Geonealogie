import { getAllPersons, getStore } from '@/lib/gedcom-store';
import DashboardSearch from './DashboardSearch';
import SurnameGrid from './SurnameGrid';
import GlobalMapWrapper from './map/GlobalMapWrapper';

interface SurnameGroup {
  surname: string;
  count: number;
  focusId: string;
  sampleNames: string[];
}

async function buildSurnameGroups(): Promise<SurnameGroup[]> {
  const persons = await getAllPersons();
  const groups = new Map<string, { ids: string[]; names: Set<string>; oldest?: { id: string; year: number } }>();

  for (const p of persons) {
    const key = p.surname || '(sans nom)';
    if (!groups.has(key)) groups.set(key, { ids: [], names: new Set() });
    const g = groups.get(key)!;
    g.ids.push(p.id);
    if (p.givenNames) g.names.add(p.givenNames.split(' ')[0]);
    const year = p.birthYear ? parseInt(p.birthYear) : undefined;
    if (year && (!g.oldest || year < g.oldest.year)) {
      g.oldest = { id: p.id, year };
    }
  }

  return Array.from(groups.entries())
    .map(([surname, g]) => ({
      surname,
      count: g.ids.length,
      focusId: g.oldest?.id ?? g.ids[0],
      sampleNames: Array.from(g.names).slice(0, 3),
    }))
    .sort((a, b) => b.count - a.count);
}

async function getStats() {
  const persons = await getAllPersons();
  const store = await getStore();
  const years = persons.map(p => p.birthYear ? parseInt(p.birthYear) : null).filter((y): y is number => y !== null);
  const minYear = years.length ? Math.min(...years) : null;
  const maxYear = years.length ? Math.max(...years) : null;

  // Distribution par siècle
  const centuryCounts = new Map<number, number>();
  for (const y of years) {
    const century = Math.floor(y / 100) * 100;
    centuryCounts.set(century, (centuryCounts.get(century) ?? 0) + 1);
  }
  const centuries = Array.from(centuryCounts.entries())
    .sort(([a], [b]) => a - b)
    .map(([century, count]) => ({ label: `${century + 1}–${century + 100}`, count }));

  return {
    totalPersons: persons.length,
    totalFamilies: store.families.size,
    minYear,
    maxYear,
    centuries,
  };
}

export default async function Dashboard() {
  const stats = await getStats();
  const surnameGroups = await buildSurnameGroups();

  return (
    <div className="min-h-screen dark:bg-slate-950" style={{ background: 'radial-gradient(ellipse at 50% 30%, #fdf8f2 0%, #f5eddf 55%, #ede2cf 100%)' }}>
      {/* Hero */}
      <div className="relative" style={{ background: 'linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)' }}>
        <div className="relative max-w-4xl mx-auto px-6 py-20 text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full border border-white/25 bg-white/10 flex items-center justify-center backdrop-blur-sm">
              <svg className="w-9 h-9 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M12 3v18M12 3c-3 0-6 3-6 6s3 3 6 3M12 3c3 0 6 3 6 6s-3 3-6 3M12 12c-3 0-6 3-6 6M12 12c3 0 6 3 6 6" />
              </svg>
            </div>
          </div>

          <h1 className="text-5xl font-bold text-white mb-3 tracking-tight" style={{ fontFamily: 'var(--font-serif, Georgia, serif)' }}>
            Arbre Généalogique
          </h1>
          <p className="text-lg text-green-200/75 mb-10 italic" style={{ fontFamily: 'var(--font-serif, Georgia, serif)' }}>
            Famille Dudouyt
          </p>

          {/* Stats */}
          <div className="flex justify-center gap-6 mb-10">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{stats.totalPersons}</div>
              <div className="text-xs text-green-200/60 uppercase tracking-widest mt-1">personnes</div>
            </div>
            <div className="w-px bg-white/20" />
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{stats.totalFamilies}</div>
              <div className="text-xs text-green-200/60 uppercase tracking-widest mt-1">familles</div>
            </div>
            {stats.minYear && stats.maxYear && (
              <>
                <div className="w-px bg-white/20" />
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">{stats.minYear}–{stats.maxYear}</div>
                  <div className="text-xs text-green-200/60 uppercase tracking-widest mt-1">période</div>
                </div>
              </>
            )}
          </div>

          {/* Search */}
          <div className="max-w-lg mx-auto">
            <DashboardSearch />
          </div>
        </div>
      </div>

      {/* Global map */}
      <div className="max-w-4xl mx-auto px-6 pt-8 pb-0">
        <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#3d2e1e' }}>
          Carte des origines
        </h2>
        <div className="dark:bg-slate-900 rounded-xl p-4 shadow-sm" style={{ height: '420px', background: '#fffaf5', border: '1px solid #e8dcc8' }}>
          <GlobalMapWrapper />
        </div>
      </div>

      {/* Stats — répartition par siècle */}
      {stats.centuries.length > 0 && (
        <div className="max-w-4xl mx-auto px-6 pt-8 pb-0">
          <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#3d2e1e' }}>
            Répartition par siècle
          </h2>
          <div className="dark:bg-slate-900 rounded-xl p-5 shadow-sm" style={{ background: '#fffaf5', border: '1px solid #e8dcc8' }}>
            {(() => {
              const max = Math.max(...stats.centuries.map(c => c.count));
              return stats.centuries.map(c => (
                <div key={c.label} className="flex items-center gap-3 mb-2">
                  <span className="text-xs w-20 shrink-0 text-right" style={{ color: '#8a7560' }}>{c.label}</span>
                  <div className="flex-1 rounded-full h-4 overflow-hidden" style={{ background: '#ede2cf' }}>
                    <div
                      className="bg-primary/80 h-full rounded-full transition-all"
                      style={{ width: `${(c.count / max) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium w-8 shrink-0" style={{ color: '#6b5740' }}>{c.count}</span>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* Surname grid */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="text-xl font-bold mb-6" style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#3d2e1e' }}>
          Noms de famille <span className="font-normal text-base" style={{ color: '#a89070' }}>({surnameGroups.length})</span>
        </h2>
        <SurnameGrid groups={surnameGroups} initialLimit={40} />
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto px-6 pb-12 flex flex-wrap justify-center gap-6">
        <a
          href="/person/new"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-primary transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ajouter un membre
        </a>
        <a
          href="/feedback"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-primary transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.346A3.004 3.004 0 0112 21a3.004 3.004 0 01-2.121-.879l-.346-.346z" />
          </svg>
          Suggérer une amélioration
        </a>
      </div>
    </div>
  );
}
