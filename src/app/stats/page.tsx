import { getAllPersons } from '@/lib/gedcom-store';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Statistiques — Géonéalogie' };

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
    <div style={{ flex: 1, height: 9, background: '#f1ebdd', borderRadius: 999, overflow: 'hidden' }}>
      <div style={{ height: '100%', borderRadius: 999, background: color, width: `${pct}%` }} />
    </div>
  );
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fffdf9', border: '1px solid #e7e0d0', borderRadius: 16, padding: 24 }}>
      {title && (
        <h2 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 18,
          fontWeight: 500,
          color: '#1c1f1c',
          margin: '0 0 16px',
          letterSpacing: '-0.01em',
        }}>
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}

function RankList({ items, max, color, labelWidth }: {
  items: { value: string; count: number }[];
  max: number;
  color: string;
  labelWidth?: number;
}) {
  if (items.length === 0) {
    return <p style={{ fontSize: 13.5, color: '#9aa89b', margin: 0 }}>Aucune donnée</p>;
  }
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
      {items.map(({ value, count }) => (
        <li key={value} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            fontSize: 13.5,
            color: '#1c1f1c',
            width: labelWidth,
            flex: labelWidth ? undefined : 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}>
            {value}
          </span>
          <Bar count={count} max={max} color={color} />
          <span style={{ fontSize: 13, fontWeight: 500, color: '#8a8474', width: 32, textAlign: 'right', flexShrink: 0 }}>
            {count}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default async function StatsPage() {
  const persons = await getAllPersons();

  const withDates = persons.filter(p => p.birthYear && p.deathYear);
  const lifespans = withDates.map(p => parseInt(p.deathYear!) - parseInt(p.birthYear!)).filter(n => n > 0 && n < 120);
  const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
  const avgAll = avg(lifespans);
  const avgM = avg(lifespans.filter((_, i) => withDates[i].sex === 'M'));
  const avgF = avg(lifespans.filter((_, i) => withDates[i].sex === 'F'));

  const years = persons.map(p => p.birthYear ? parseInt(p.birthYear) : null).filter(Boolean) as number[];
  const minYear = years.length ? Math.min(...years) : null;
  const maxYear = years.length ? Math.max(...years) : null;

  const centuryMap = new Map<number, number>();
  for (const y of years) {
    const c = Math.floor(y / 100) * 100;
    centuryMap.set(c, (centuryMap.get(c) ?? 0) + 1);
  }
  const centuries = [...centuryMap.entries()].sort((a, b) => a[0] - b[0]);
  const maxCenturyCount = Math.max(...centuries.map(([, n]) => n));

  const topOccupations = top(persons.map(p => p.occupation).filter(Boolean) as string[]);
  const maxOcc = topOccupations[0]?.count ?? 1;

  const firstnames = persons.map(p => p.givenNames.split(/[\s,]+/)[0]).filter(Boolean);
  const topFirstnames = top(firstnames);
  const maxFn = topFirstnames[0]?.count ?? 1;

  const topSurnames = top(persons.map(p => p.surname).filter(Boolean));
  const maxSn = topSurnames[0]?.count ?? 1;

  const maleCount = persons.filter(p => p.sex === 'M').length;
  const femaleCount = persons.filter(p => p.sex === 'F').length;
  const unknownCount = persons.filter(p => p.sex === 'U').length;

  const countries = persons
    .map(p => {
      const parts = (p.birthPlaceFull || '').split(',').map(s => s.trim());
      return parts[4] || parts[3] || null;
    })
    .filter(Boolean) as string[];
  const topCountries = top(countries);
  const maxCountry = topCountries[0]?.count ?? 1;

  const sexRows = [
    { label: 'Hommes', count: maleCount, color: '#5b7da3' },
    { label: 'Femmes', count: femaleCount, color: '#b5736b' },
    { label: 'Inconnu', count: unknownCount, color: '#9aa89b' },
  ];

  const lifespanRows = [
    { label: 'Globale', value: avgAll },
    { label: 'Hommes', value: avgM },
    { label: 'Femmes', value: avgF },
  ];

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '32px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 30,
            fontWeight: 500,
            color: '#1c1f1c',
            margin: 0,
            letterSpacing: '-0.02em',
          }}>
            Statistiques
          </h1>
          <p style={{ fontSize: 13.5, color: '#8a8474', margin: '6px 0 0' }}>
            Vue d&apos;ensemble chiffrée de l&apos;arbre familial.
          </p>
        </div>
        <a
          href="/api/export/csv"
          download="genealogie.csv"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            height: 38,
            padding: '0 16px',
            background: '#fffdf9',
            border: '1px solid #e0d8c6',
            color: '#1c1f1c',
            borderRadius: 10,
            fontSize: 13.5,
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Exporter CSV
        </a>
      </div>

      {/* Key figures */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Personnes', value: persons.length },
          { label: 'Période', value: minYear && maxYear ? `${minYear}–${maxYear}` : '—' },
          { label: 'Espérance de vie', value: avgAll ? `${avgAll} ans` : '—' },
          { label: 'Professions', value: topOccupations.length },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: '#fffdf9', border: '1px solid #e7e0d0', borderRadius: 16, padding: '20px 16px', textAlign: 'center' }}>
            <p style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 30,
              fontWeight: 500,
              color: '#2f5142',
              margin: 0,
              letterSpacing: '-0.02em',
            }}>
              {value}
            </p>
            <p style={{ fontSize: 11.5, letterSpacing: '.08em', textTransform: 'uppercase', color: '#9aa89b', margin: '6px 0 0' }}>
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Sex + lifespan */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 24 }}>
        <Card title="Répartition par sexe">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sexRows.map(({ label, count, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 64, fontSize: 13.5, color: '#5a5e52', flexShrink: 0 }}>{label}</span>
                <Bar count={count} max={persons.length} color={color} />
                <span style={{ fontSize: 13.5, fontWeight: 500, color: '#1c1f1c', width: 40, textAlign: 'right', flexShrink: 0 }}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card title={`Espérance de vie (${lifespans.length} personnes)`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {lifespanRows.map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13.5, color: '#5a5e52' }}>{label}</span>
                <span style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 24,
                  fontWeight: 500,
                  color: '#2f5142',
                }}>
                  {value ? `${value} ans` : '—'}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Births by century */}
      <div style={{ marginBottom: 24 }}>
        <Card title="Naissances par siècle">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 130 }}>
            {centuries.map(([century, count]) => (
              <div key={century} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 11.5, color: '#8a8474' }}>{count}</span>
                <div style={{
                  width: '100%',
                  background: '#2f5142',
                  borderRadius: '6px 6px 0 0',
                  height: `${Math.round((count / maxCenturyCount) * 100)}%`,
                  minHeight: 4,
                }} />
                <span style={{ fontSize: 11.5, color: '#9aa89b', whiteSpace: 'nowrap' }}>{century}s</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Rankings */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        <Card title="Top professions">
          <RankList items={topOccupations} max={maxOcc} color="#2f5142" />
        </Card>
        <Card title="Top prénoms">
          <RankList items={topFirstnames} max={maxFn} color="#c9a86a" labelWidth={96} />
        </Card>
        <Card title="Top noms de famille">
          <RankList items={topSurnames} max={maxSn} color="#1e3a2f" labelWidth={128} />
        </Card>
        <Card title="Pays d'origine">
          <RankList items={topCountries} max={maxCountry} color="#5b7da3" labelWidth={96} />
        </Card>
      </div>
    </div>
  );
}
