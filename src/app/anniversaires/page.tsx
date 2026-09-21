import Link from 'next/link';
import { getAllPersons, getStore, isPresumedAlive } from '@/lib/gedcom-store';
import { parseDayMonth } from '@/lib/gedcom/date-normalizer';
import { Badge } from '@/components/ui/Badge';

export const metadata = { title: 'Anniversaires — Géonéalogie' };

const MONTHS_FR = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

function nextOccurrence(day: number, month: number, today: Date): { daysUntil: number; targetYear: number } {
  const thisYear = today.getFullYear();
  let target = new Date(thisYear, month - 1, day);
  if (target < today) target = new Date(thisYear + 1, month - 1, day);
  return {
    daysUntil: Math.round((target.getTime() - today.getTime()) / 86400000),
    targetYear: target.getFullYear(),
  };
}

function extractYear(raw?: string): string | undefined {
  if (!raw) return undefined;
  const m = raw.match(/\b(\d{4})\b/);
  return m?.[1];
}

export default async function AnniversairesPage({
  searchParams,
}: {
  searchParams: Promise<{ ancetres?: string }>;
}) {
  const { ancetres } = await searchParams;
  const includeAncestors = ancetres === '1';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentYear = today.getFullYear();

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
    alive: boolean;
    upcomingAge?: number;
  };

  const entries: Entry[] = [];

  // Dédoublonnage : le GEDCOM contient des personnes dupliquées (mêmes nom + date)
  const seenBirths = new Set<string>();

  for (const p of persons) {
    const birth = parseDayMonth(p.birthDateRaw);
    if (!birth) continue;

    const birthKey = `${p.displayName}|${birth.day}/${birth.month}|${p.birthYear ?? ''}`;
    if (seenBirths.has(birthKey)) continue;
    seenBirths.add(birthKey);

    const alive = isPresumedAlive(p, currentYear);
    if (!includeAncestors && !alive) continue;

    const { daysUntil, targetYear } = nextOccurrence(birth.day, birth.month, today);
    const birthYearNum = p.birthYear ? parseInt(p.birthYear) : NaN;

    entries.push({
      personId: p.id,
      name: p.displayName,
      sex: p.sex,
      day: birth.day,
      month: birth.month,
      year: p.birthYear,
      daysUntil,
      type: 'naissance',
      alive,
      upcomingAge: !isNaN(birthYearNum) ? targetYear - birthYearNum : undefined,
    });
  }

  // Anniversaires de mariage — dédoublonnés par couple + date, car le GEDCOM
  // contient des enregistrements FAM dupliqués pour un même couple
  const seenCouples = new Set<string>();
  for (const [, fam] of s.families) {
    const marr = parseDayMonth(fam.marriageDateRaw);
    if (!marr) continue;

    const husb = fam.husbandId ? s.persons.get(fam.husbandId) : undefined;
    const wife = fam.wifeId ? s.persons.get(fam.wifeId) : undefined;
    if (!husb && !wife) continue;

    const marriageYear = extractYear(fam.marriageDateRaw);
    const coupleKey = [husb?.displayName ?? '', wife?.displayName ?? '']
      .sort()
      .join('|') + `|${marr.day}/${marr.month}|${marriageYear ?? ''}`;
    if (seenCouples.has(coupleKey)) continue;
    seenCouples.add(coupleKey);

    const bothAlive = isPresumedAlive(husb, currentYear) && isPresumedAlive(wife, currentYear);
    if (!includeAncestors && !bothAlive) continue;

    const primary = husb ?? wife!;
    const spouse = husb ? wife : undefined;
    const { daysUntil, targetYear } = nextOccurrence(marr.day, marr.month, today);
    const marriageYearNum = marriageYear ? parseInt(marriageYear) : NaN;

    entries.push({
      personId: primary.id,
      name: primary.displayName,
      spouseName: spouse?.displayName,
      day: marr.day,
      month: marr.month,
      year: marriageYear,
      daysUntil,
      type: 'mariage',
      alive: bothAlive,
      upcomingAge: !isNaN(marriageYearNum) ? targetYear - marriageYearNum : undefined,
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
    <div className="min-h-full" style={{ background: '#f4f1ea' }}>
      <main className="mx-auto px-6 py-10 space-y-6" style={{ maxWidth: '760px' }}>

        {/* En-tête */}
        <div className="mb-8" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          <div>
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
              {includeAncestors
                ? 'Naissances et mariages à venir dans les 12 prochains mois, ancêtres inclus.'
                : 'Les anniversaires à fêter dans la famille au cours des 12 prochains mois.'}
            </p>
          </div>
          <Link
            href={includeAncestors ? '/anniversaires' : '/anniversaires?ancetres=1'}
            style={{
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              padding: '8px 14px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
              marginTop: '4px',
              ...(includeAncestors
                ? { background: '#1e3a2f', color: '#f1ede2', border: '1px solid #1e3a2f' }
                : { background: '#fffdf9', color: '#1c1f1c', border: '1px solid #e0d8c6' }),
            }}
          >
            Inclure les ancêtres
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <p style={{ color: '#8a8474', textAlign: 'center', padding: '48px 0' }}>
            {includeAncestors
              ? 'Aucun anniversaire prévu dans les 12 prochains mois.'
              : 'Aucun anniversaire de personne vivante dans les 12 prochains mois. Activez « Inclure les ancêtres » pour voir tous les événements.'}
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

                  let sublabel: string;
                  if (e.type === 'naissance') {
                    sublabel = e.alive && e.upcomingAge != null
                      ? `Fête ses ${e.upcomingAge} ans`
                      : `Naissance${e.year ? ` · ${e.sex === 'M' ? 'né' : 'née'} en ${e.year}` : ''}`;
                  } else {
                    sublabel = e.alive && e.upcomingAge != null
                      ? `Fêtent leurs ${e.upcomingAge} ans de mariage`
                      : `Mariage${e.year ? ` · ${e.year}` : ''}`;
                  }

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
