import Link from 'next/link';
import { getAllPersons, getSpouses } from '@/lib/gedcom-store';

const MONTHS_FR = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const MONTHS_GEDCOM: Record<string, number> = {
  JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12
};

function parseDayMonth(raw?: string): { day: number; month: number } | null {
  if (!raw) return null;
  // "15 JAN 1850" or "15 JAN" or "JAN 1850" — need day AND month
  const m = raw.match(/\b(\d{1,2})\s+([A-Z]{3})\b/);
  if (!m) return null;
  const day = parseInt(m[1]);
  const month = MONTHS_GEDCOM[m[2]];
  if (!month || day < 1 || day > 31) return null;
  return { day, month };
}

function daysUntil(day: number, month: number, today: Date): number {
  const thisYear = today.getFullYear();
  let target = new Date(thisYear, month - 1, day);
  if (target < today) target = new Date(thisYear + 1, month - 1, day);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export default async function AnniversairesPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const persons = await getAllPersons();

  type Entry = { label: string; personId: string; name: string; day: number; month: number; year?: string; daysUntil: number; type: 'naissance' | 'mariage' };
  const entries: Entry[] = [];

  for (const p of persons) {
    const birth = parseDayMonth(p.birthDateRaw);
    if (birth) {
      entries.push({
        label: 'Naissance', personId: p.id, name: p.displayName,
        day: birth.day, month: birth.month,
        year: p.birthYear,
        daysUntil: daysUntil(birth.day, birth.month, today),
        type: 'naissance',
      });
    }
  }

  // Marriage anniversaries — fetch via spouseRelations
  const seen = new Set<string>();
  for (const p of persons) {
    const spouses = await getSpouses(p.id);
    for (const s of spouses) {
      const key = [p.id, s.familyId].sort().join('-');
      if (seen.has(key)) continue;
      seen.add(key);
      const marr = parseDayMonth(s.marriageDateRaw);
      if (marr) {
        entries.push({
          label: `Mariage avec ${s.person?.displayName ?? '?'}`,
          personId: p.id, name: p.displayName,
          day: marr.day, month: marr.month,
          year: s.marriageDateRaw ? s.marriageDateRaw.match(/\d{4}/)?.[0] : undefined,
          daysUntil: daysUntil(marr.day, marr.month, today),
          type: 'mariage',
        });
      }
    }
  }

  entries.sort((a, b) => a.daysUntil - b.daysUntil);
  const upcoming = entries.filter(e => e.daysUntil <= 365);

  // Group by month
  const byMonth: Record<number, Entry[]> = {};
  for (const e of upcoming) {
    (byMonth[e.month] ??= []).push(e);
  }
  const months = Object.keys(byMonth).map(Number).sort((a, b) => {
    const da = byMonth[a][0].daysUntil;
    const db = byMonth[b][0].daysUntil;
    return da - db;
  });

  return (
    <div className="h-screen overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link href="/" className="text-sm text-primary hover:underline flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Arbre
          </Link>
          <h1 className="text-lg font-bold text-slate-800 dark:text-slate-200">Anniversaires</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-6">
        {upcoming.length === 0 ? (
          <p className="text-slate-400 text-center py-12">Aucun anniversaire avec date complète (jour + mois) trouvé.</p>
        ) : months.map(month => (
          <div key={month} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-3 bg-primary/5 border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-semibold text-slate-700 dark:text-slate-300 capitalize">
                {MONTHS_FR[month - 1]}
              </h2>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {byMonth[month].sort((a, b) => a.day - b.day).map((e, i) => {
                const isToday = e.daysUntil === 0;
                const isSoon = e.daysUntil <= 7;
                return (
                  <div key={i} className={`flex items-center px-6 py-3 gap-4 ${isToday ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}`}>
                    <div className="w-10 text-center shrink-0">
                      <span className={`text-lg font-bold ${isToday ? 'text-yellow-600' : 'text-slate-400'}`}>{e.day}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/person/${e.personId}`} className="text-sm font-medium hover:text-primary transition-colors">
                        {e.name}
                      </Link>
                      <p className="text-xs text-slate-400">
                        {e.label}{e.year ? ` · né(e) en ${e.year}` : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {isToday ? (
                        <span className="text-xs font-semibold text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded-full">Aujourd&apos;hui</span>
                      ) : (
                        <span className={`text-xs ${isSoon ? 'text-orange-500 font-medium' : 'text-slate-400'}`}>
                          dans {e.daysUntil} jour{e.daysUntil > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
