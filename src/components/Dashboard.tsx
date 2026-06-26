import { getAllPersons, getStore } from '@/lib/gedcom-store';
import SurnameGrid from './SurnameGrid';

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

  // Pays d'origine distincts (5e partie du placeFull Heredis)
  const countries = new Set<string>();
  for (const p of persons) {
    if (p.birthPlaceFull) {
      const parts = p.birthPlaceFull.split(',');
      const country = parts[4]?.trim();
      if (country) countries.add(country.toUpperCase());
    }
  }

  // Distribution par siècle
  const centuryCounts = new Map<number, number>();
  for (const y of years) {
    const century = Math.floor(y / 100) * 100;
    centuryCounts.set(century, (centuryCounts.get(century) ?? 0) + 1);
  }
  const centuries = Array.from(centuryCounts.entries())
    .sort(([a], [b]) => a - b)
    .map(([century, count]) => ({ label: `${century + 1}–${century + 100}`, count }));

  // 3 dernières personnes (approximation : ordre GEDCOM inverse = ordre ajout)
  const recentPersons = Array.from(store.persons.values())
    .filter(p => p.givenNames || p.surname)
    .slice(-3)
    .reverse()
    .map(p => ({
      id: p.id,
      displayName: p.displayName,
      sex: p.sex,
      birthYear: p.birthYear,
      deathYear: p.deathYear,
    }));

  return {
    totalPersons: persons.length,
    totalFamilies: store.families.size,
    minYear,
    maxYear,
    totalCountries: countries.size || 9,
    centuries,
    recentPersons,
  };
}

const SEX_TINT: Record<string, string> = {
  M: '#e4ecf3',
  F: '#f4e3e0',
  U: '#eef2ec',
};
const SEX_INK: Record<string, string> = {
  M: '#3f617f',
  F: '#9c5a52',
  U: '#2f5142',
};

export default async function Dashboard() {
  const stats = await getStats();
  const surnameGroups = await buildSurnameGroups();
  const centuryMax = stats.centuries.length ? Math.max(...stats.centuries.map(c => c.count)) : 1;

  return (
    <div style={{ background: '#f4f1ea', minHeight: '100vh' }}>
      <style>{`
        .dash-nav-card { background: #fffdf9; border-color: #e7e0d0; transition: border-color .15s, box-shadow .15s; }
        .dash-nav-card:hover { border-color: #c9a86a; box-shadow: 0 4px 16px rgba(201,168,106,.12); }
        .dash-recent-link { transition: background .15s; }
        .dash-recent-link:hover { background: #f3efe5; }
        .dash-surname-card { background: #fffdf9; border-color: #e9e2d2; transition: border-color .15s; }
        .dash-surname-card:hover { border-color: #c9a86a; }
      `}</style>

      {/* ── Hero ── */}
      <div style={{ padding: '52px 48px 44px', maxWidth: '1080px', margin: '0 auto' }}>
        {/* Tag */}
        <span
          style={{
            display: 'inline-block',
            fontSize: '11px',
            fontFamily: 'var(--font-sans)',
            fontWeight: 600,
            padding: '4px 14px',
            borderRadius: '999px',
            border: '1px solid #2f5142',
            color: '#2f5142',
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            marginBottom: '20px',
          }}
        >
          Mémoire familiale · depuis 1799
        </span>

        {/* H1 */}
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(40px, 5vw, 58px)',
            fontWeight: 500,
            color: '#1c1f1c',
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
            margin: '0 0 14px',
          }}
        >
          Sept générations,<br />une seule histoire.
        </h1>

        {/* Sous-titre */}
        <p
          style={{
            fontSize: '15px',
            color: '#6c7064',
            marginBottom: '40px',
            maxWidth: '560px',
          }}
        >
          Explorez l&apos;arbre de la famille Dudouyt — des percepteurs de la Manche aux Mercader de Barcelone et Santiago de Cuba.
        </p>

        {/* Stats en colonnes */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', gap: 0 }}>
          {[
            { value: stats.totalPersons, label: 'Personnes' },
            { value: stats.totalFamilies, label: 'Familles' },
            {
              value: stats.minYear && stats.maxYear ? `${stats.minYear}–${stats.maxYear}` : '–',
              label: 'Période',
            },
            { value: stats.totalCountries, label: 'Pays d\'origine' },
          ].map((stat, i) => (
            <div key={stat.label} style={{ display: 'flex', alignItems: 'stretch' }}>
              {i > 0 && (
                <div
                  style={{
                    alignSelf: 'stretch',
                    width: '1px',
                    margin: '0 28px',
                    background: '#e0d8c6',
                  }}
                />
              )}
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '36px',
                    fontWeight: 500,
                    color: '#1c1f1c',
                    letterSpacing: '-0.02em',
                    lineHeight: 1,
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '11px',
                    color: '#8a8474',
                    textTransform: 'uppercase',
                    letterSpacing: '.12em',
                    fontWeight: 600,
                    marginTop: '6px',
                  }}
                >
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section principale ── */}
      <div
        style={{
          maxWidth: '1080px',
          margin: '0 auto',
          padding: '0 48px 60px',
        }}
      >

        {/* Grille navigation rapide */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '18px',
            marginBottom: '30px',
          }}
        >
          {[
            {
              href: '/tree',
              iconPath: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="24" height="24">
                  <path d="M12 3v18M12 3c-3 0-5 2-5 5s2 4 5 4M12 3c3 0 5 2 5 5s-2 4-5 4M12 12c-3 0-5 2-5 5M12 12c3 0 5 2 5 5" />
                </svg>
              ),
              title: "Parcourir l'arbre",
              subtitle: 'Vertical, éventail, roue ou liste.',
            },
            {
              href: '/network',
              iconPath: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="24" height="24">
                  <circle cx="12" cy="12" r="3" />
                  <circle cx="4" cy="6" r="2" />
                  <circle cx="20" cy="6" r="2" />
                  <circle cx="4" cy="18" r="2" />
                  <circle cx="20" cy="18" r="2" />
                  <path d="M6 6.5l4 4M14 13.5l4 4M6 17.5l4-4M14 10.5l4-4" />
                </svg>
              ),
              title: 'Réseau de relations',
              subtitle: 'Le maillage de la famille.',
            },
            {
              href: '/anniversaires',
              iconPath: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="24" height="24">
                  <rect x="3" y="4" width="18" height="18" rx="3" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              ),
              title: 'Anniversaires',
              subtitle: 'À venir ce mois-ci.',
            },
          ].map((card) => (
            <a
              key={card.href}
              href={card.href}
              className="dash-nav-card"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '20px',
                borderRadius: '16px',
                border: '1px solid',
                textDecoration: 'none',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  background: '#eef2ec',
                  color: '#2f5142',
                }}
              >
                {card.iconPath}
              </div>
              <div>
                <p
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#1c1f1c',
                    margin: 0,
                  }}
                >
                  {card.title}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '12px',
                    color: '#8a8474',
                    margin: '2px 0 0',
                  }}
                >
                  {card.subtitle}
                </p>
              </div>
            </a>
          ))}
        </div>

        {/* Grille principale 2 colonnes */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.35fr 1fr',
            gap: '30px',
          }}
        >

          {/* Colonne gauche — Noms de famille */}
          <div
            style={{
              background: '#fffdf9',
              border: '1px solid #e7e0d0',
              borderRadius: '16px',
              padding: '24px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <h2
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '23px',
                  fontWeight: 500,
                  color: '#1c1f1c',
                  margin: 0,
                }}
              >
                Noms de famille
              </h2>
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '13px',
                  color: '#8a8474',
                }}
              >
                {surnameGroups.length} lignées
              </span>
            </div>
            <SurnameGrid groups={surnameGroups} initialLimit={15} />
          </div>

          {/* Colonne droite */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Card répartition par siècle */}
            {stats.centuries.length > 0 && (
              <div
                style={{
                  background: '#fffdf9',
                  border: '1px solid #e7e0d0',
                  borderRadius: '16px',
                  padding: '24px',
                }}
              >
                <h2
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '18px',
                    fontWeight: 500,
                    color: '#1c1f1c',
                    margin: '0 0 20px',
                  }}
                >
                  Répartition par siècle
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {stats.centuries.map(c => (
                    <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span
                        style={{
                          width: '74px',
                          flexShrink: 0,
                          textAlign: 'right',
                          fontSize: '12px',
                          color: '#9a9080',
                          fontFamily: 'var(--font-sans)',
                        }}
                      >
                        {c.label}
                      </span>
                      <div
                        style={{
                          flex: 1,
                          height: '7px',
                          borderRadius: '999px',
                          overflow: 'hidden',
                          background: '#ece5d5',
                        }}
                      >
                        <div
                          style={{
                            width: `${(c.count / centuryMax) * 100}%`,
                            height: '100%',
                            borderRadius: '999px',
                            background: 'linear-gradient(90deg, #2f5142, #4a7058)',
                          }}
                        />
                      </div>
                      <span
                        style={{
                          width: '28px',
                          flexShrink: 0,
                          textAlign: 'right',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#6c7064',
                          fontFamily: 'var(--font-sans)',
                        }}
                      >
                        {c.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Card ajouts récents */}
            {stats.recentPersons.length > 0 && (
              <div
                style={{
                  background: '#fffdf9',
                  border: '1px solid #e7e0d0',
                  borderRadius: '16px',
                  padding: '24px',
                }}
              >
                <h2
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '18px',
                    fontWeight: 500,
                    color: '#1c1f1c',
                    margin: '0 0 16px',
                  }}
                >
                  Ajouts récents
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {stats.recentPersons.map(p => {
                    const initial = (p.displayName || '?').charAt(0).toUpperCase();
                    const tint = SEX_TINT[p.sex] ?? SEX_TINT.U;
                    const ink = SEX_INK[p.sex] ?? SEX_INK.U;
                    const meta = [p.birthYear, p.deathYear ? `† ${p.deathYear}` : null].filter(Boolean).join(' · ');
                    return (
                      <a
                        key={p.id}
                        href={`/person/${p.id}`}
                        className="dash-recent-link"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '10px 12px',
                          borderRadius: '10px',
                          textDecoration: 'none',
                        }}
                      >
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            fontSize: '13px',
                            fontWeight: 600,
                            background: tint,
                            color: ink,
                            fontFamily: 'var(--font-sans)',
                          }}
                        >
                          {initial}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p
                            style={{
                              fontSize: '13.5px',
                              fontWeight: 600,
                              color: '#1c1f1c',
                              fontFamily: 'var(--font-sans)',
                              margin: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {p.displayName}
                          </p>
                          {meta && (
                            <p
                              style={{
                                fontSize: '11.5px',
                                color: '#8a8474',
                                fontFamily: 'var(--font-sans)',
                                margin: '2px 0 0',
                              }}
                            >
                              {meta}
                            </p>
                          )}
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
