import Link from 'next/link';
import { getAllPersons, getStore } from '@/lib/gedcom-store';
import { parseDayMonth, extractYear } from '@/lib/gedcom/date-normalizer';

type Entry = {
  personId: string;
  name: string;
  spouseName?: string;
  sex?: 'M' | 'F' | 'U';
  year: number;
  type: 'naissance' | 'décès' | 'mariage';
};

export default async function OnThisDay() {
  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  const persons = await getAllPersons();
  const store = await getStore();

  const entries: Entry[] = [];
  const seen = new Set<string>();

  for (const p of persons) {
    if (p.birthYear) {
      const birth = parseDayMonth(p.birthDateRaw);
      if (birth && birth.day === day && birth.month === month) {
        const key = `b|${p.displayName}|${p.birthYear}`;
        if (!seen.has(key)) {
          seen.add(key);
          entries.push({ personId: p.id, name: p.displayName, sex: p.sex, year: Number(p.birthYear), type: 'naissance' });
        }
      }
    }
    if (p.deathYear) {
      const death = parseDayMonth(p.deathDateRaw);
      if (death && death.day === day && death.month === month) {
        const key = `d|${p.displayName}|${p.deathYear}`;
        if (!seen.has(key)) {
          seen.add(key);
          entries.push({ personId: p.id, name: p.displayName, sex: p.sex, year: Number(p.deathYear), type: 'décès' });
        }
      }
    }
  }

  const seenCouples = new Set<string>();
  for (const [, fam] of store.families) {
    const marr = parseDayMonth(fam.marriageDateRaw);
    if (!marr || marr.day !== day || marr.month !== month) continue;
    const year = extractYear(fam.marriageDateRaw);
    if (!year) continue;

    const husb = fam.husbandId ? store.persons.get(fam.husbandId) : undefined;
    const wife = fam.wifeId ? store.persons.get(fam.wifeId) : undefined;
    if (!husb && !wife) continue;

    const key = [husb?.displayName ?? '', wife?.displayName ?? ''].sort().join('|') + `|${year}`;
    if (seenCouples.has(key)) continue;
    seenCouples.add(key);

    const primary = husb ?? wife!;
    const spouse = husb ? wife : undefined;
    entries.push({ personId: primary.id, name: primary.displayName, spouseName: spouse?.displayName, year: Number(year), type: 'mariage' });
  }

  entries.sort((a, b) => b.year - a.year);
  const top = entries.slice(0, 6);
  const dateLabel = today.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

  return (
    <div style={{ background: 'var(--paper-card)', border: '1px solid var(--line)', borderRadius: 16, padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 500, color: 'var(--ink-900)', margin: 0 }}>
          Ce jour-là
        </h2>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-secondary)', textTransform: 'capitalize' }}>
          {dateLabel}
        </span>
      </div>

      {top.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--ink-500)', margin: 0, lineHeight: 1.6 }}>
          Rien de précis dans les archives pour aujourd&apos;hui.{' '}
          <Link href="/anniversaires" style={{ color: 'var(--green-600)', fontWeight: 600, textDecoration: 'none' }}>
            Voir les anniversaires du mois →
          </Link>
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {top.map((e, i) => {
            const agoYears = currentYear - e.year;
            const ago = agoYears > 0 ? `il y a ${agoYears} ans` : 'cette année';
            const f = e.sex === 'F';
            const verb = e.type === 'naissance'
              ? `est né${f ? 'e' : ''}`
              : e.type === 'décès'
              ? `est décédé${f ? 'e' : ''}`
              : 'se sont mariés';
            const who = e.type === 'mariage' && e.spouseName ? `${e.name} & ${e.spouseName}` : e.name;
            return (
              <Link
                key={i}
                href={`/person/${e.personId}`}
                style={{
                  display: 'flex', alignItems: 'baseline', gap: 8,
                  fontSize: 13.5, color: 'var(--ink-600)', textDecoration: 'none', lineHeight: 1.5,
                }}
              >
                <span style={{ fontWeight: 600, color: 'var(--ink-900)' }}>{who}</span>
                <span style={{ color: 'var(--ink-secondary)' }}>{verb} en {e.year} — {ago}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
