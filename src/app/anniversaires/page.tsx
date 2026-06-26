import Link from 'next/link';
import { getAllPersons, getStore } from '@/lib/gedcom-store';
import { Badge } from '@/components/ui/Badge';

export const metadata = { title: 'Anniversaires — Géonéalogie' };

const MONTHS_FR = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const MONTHS_GEDCOM: Record<string, number> = {
  JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12
};

function parseDayMonth(raw?: string): { day: number; month: number } | null {
  if (!raw) return null;
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

function extractYear(raw?: string): string | undefined {
  if (!raw) return undefined;
  const m = raw.match(/\b(\d{4})\b/);
  return m?.[1];
}

export default async function AnniversairesPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const persons = await getAllPersons();
  const s = await getStore();

  type Entry = {
    personId: string;
    name: string;
    sex?: string;
    day: number;
    month: number;
    year?: string;
    daysUntil: number;
    type: 'naissance' | 'mariage';
    spouseName?: string;
  };

  const entries: Entry[] = [];

  for (const p of persons) {
    const birth = parseDayMonth(p.birthDateRaw);
    if (birth) {
      entries.push({
        personId: p.id,
        name: p.displayName,
        sex: p.sex,
        day: birth.day,
        month: birth.month,
        year: p.birthYear,
        daysUntil: daysUntil(birth.day, birth.month, today),
        type: 'naissance',
      });
    }
  }

  // Marriage anniversaries — iterate families directly to avoid N+1 calls
  const seenFams = new Set<string>();
  for (const [, fam] of s.families) {
    const marr = parseDayMonth(fam.marriageDateRaw);
    if (!marr) continue;
    if (seenFams.has(fam.id)) continue;
    seenFams.add(fam.id);

    const husb = fam.husbandId ? s.persons.get(fam.husbandId) : undefined;
    const wife = fam.wifeId ? s.persons.get(fam.wifeId) : undefined;
    if (!husb && !wife) continue;

    const primary = husb ?? wife!;
    const spouse = husb ? wife : undefined;

    entries.push({
      personId: primary.id,
      name: primary.displayName,
      spouseName: spouse?.displayName,
      day: marr.day,
      month: marr.month,
      year: extractYear(fam.marriageDateRaw),
      daysUntil: daysUntil(marr.day, marr.month, today),
      type: 'mariage',
    });
  }

  entries.sort((a, b) => a.daysUntil - b.daysUntil);
  const upcoming = entries.filter(e => e.daysUntil <= 365);

  // Group by month
  const byMonth: Record<number, Entry[]> = {};
  for (const e of upcoming) {
    (byMonth[e.month] ??= []).push(e);
  }

  // Order months by first event's daysUntil (entries are already globally sorted)
  const months = Object.keys(byMonth).map(Number).sort((a, b) => {
    return byMonth[a][0].daysUntil - byMonth[b][0].daysUntil;
  });

  return (
    <div className="h-screen overflow-y-auto" style={{ background: '#f4f1ea' }}>
      <main className="mx-auto px-6 py-10 space-y-6" style={{ maxWidth: '760px' }}>

        {/* En-tête */}
        <div className="mb-8">
          <h1
            style={{
              fontFamily: 'var(--font-serif, Newsreader, serif)',
              fontSize: '30px',
              fontWeight: 500,
              color: '#1c1f1c',
              letterSpacing: '-0.02em',
              marginBottom: '6px',
            }}
          >
            Anniversaires
          </h1>
          <p style={{ fontSize: '13.5px', color: '#8a8474' }}>
            Naissances et mariages à venir dans les 12 prochains mois.
          </p>
        </div>

        {upcoming.length === 0 ? (
          <p style={{ color: '#8a8474', textAlign: 'center', padding: '48px 0' }}>
            Aucun anniversaire prévu dans les 12 prochains mois.
          </p>
        ) : (
          months.map(month => {
            const sortedEvents = byMonth[month].slice().sort((a, b) => a.daysUntil - b.daysUntil);
            return (
              <div
                key={month}
                style={{
                  borderRadius: '16px',
                  border: '1px solid #e9e2d2',
                  overflow: 'hidden',
                }}
              >
                {/* Header mois */}
                <div
                  style={{
                    background: '#f1f4ef',
                    borderBottom: '1px solid #e7e6dd',
                    padding: '10px 20px',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-serif, Newsreader, serif)',
                      fontSize: '16px',
                      fontWeight: 500,
                      color: '#2f5142',
                    }}
                  >
                    {MONTHS_FR[month - 1]}
                  </span>
                </div>

                {/* Événements du mois */}
                {sortedEvents.map((e, i) => {
                  const isToday = e.daysUntil === 0;
                  const isSoon = e.daysUntil <= 7 && !isToday;
                  const isLast = i === sortedEvents.length - 1;

                  const badgeTone = isToday ? 'today' : isSoon ? 'warn' : 'neutral';
                  const badgeLabel = isToday ? "Aujourd'hui" : `dans ${e.daysUntil} j`;
                  const dayColor = isToday ? '#b8860b' : '#2f5142';

                  const sublabel =
                    e.type === 'naissance'
                      ? `Naissance${e.year ? ` · ${e.sex === 'M' ? 'né' : 'née'} en ${e.year}` : ''}`
                      : `Mariage${e.year ? ` · ${e.year}` : ''}`;

                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '12px 20px',
                        borderBottom: isLast ? 'none' : '1px solid #f3eee2',
                        background: isToday ? '#fdf6e3' : 'transparent',
                      }}
                    >
                      {/* Jour */}
                      <div style={{ width: '36px', flexShrink: 0, textAlign: 'center' }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-serif, Newsreader, serif)',
                            fontSize: '20px',
                            fontWeight: 700,
                            color: dayColor,
                            lineHeight: 1,
                          }}
                        >
                          {e.day}
                        </span>
                      </div>

                      {/* Contenu */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Link
                          href={`/person/${e.personId}`}
                          style={{
                            fontSize: '14px',
                            fontWeight: 700,
                            color: '#1c1f1c',
                            textDecoration: 'none',
                            display: 'block',
                          }}
                        >
                          {e.name}
                          {e.type === 'mariage' && e.spouseName ? ` & ${e.spouseName}` : ''}
                        </Link>
                        <span
                          style={{
                            fontSize: '12px',
                            color: '#8a8474',
                            display: 'block',
                            marginTop: '1px',
                          }}
                        >
                          {sublabel}
                        </span>
                      </div>

                      {/* Badge */}
                      <Badge tone={badgeTone}>{badgeLabel}</Badge>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
