import { getAllPersons, getStore } from '@/lib/gedcom-store';
import { PersonalJourney } from './PersonalJourney';
import { loadOverrides } from '@/lib/overrides-store';
import Link from 'next/link';
import SurnameGrid from './SurnameGrid';
import OnThisDay from './OnThisDay';
import MigrationHighlight from './MigrationHighlight';

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
    if (p.givenNames) g.names.add(p.givenNames.split(/[,\s]+/).filter(Boolean)[0]);
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
    const century = Math.floor((y - 1) / 100) * 100;
    centuryCounts.set(century, (centuryCounts.get(century) ?? 0) + 1);
  }
  const centuries = Array.from(centuryCounts.entries())
    .sort(([a], [b]) => a - b)
    .map(([century, count]) => ({ label: `${century + 1}–${century + 100}`, count }));

  // Parcours de vie ayant traversé une frontière (naissance et décès dans des pays différents)
  let crossBorderJourneys = 0;
  for (const p of persons) {
    const birthCountry = p.birthPlaceFull?.split(',')[4]?.trim().toUpperCase();
    const deathCountry = p.deathPlaceFull?.split(',')[4]?.trim().toUpperCase();
    if (birthCountry && deathCountry && birthCountry !== deathCountry) crossBorderJourneys++;
  }

  const overrides = await loadOverrides();
  const recentPersons = persons.filter(p => overrides.updatedAt?.[p.id])
    .sort((a, b) => (overrides.updatedAt?.[b.id] ?? '').localeCompare(overrides.updatedAt?.[a.id] ?? '')).slice(0, 3);

  return {
    totalPersons: persons.length,
    totalFamilies: store.families.size,
    minYear,
    maxYear,
    totalCountries: countries.size || null,
    crossBorderJourneys,
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
  const people = await getAllPersons();
  const story = people.find(p => p.photoUrl && p.notes) ?? people.find(p => p.notes && p.events.length > 1) ?? people.find(p => p.notes) ?? people.find(p => p.birthYear && p.deathYear && p.occupations.length > 0);
  const centuryMax = stats.centuries.length ? Math.max(...stats.centuries.map(c => c.count)) : 1;

  return (
    <div className="dashboard" style={{ background: 'var(--paper-body)', minHeight: '100vh' }}>

      {/* ── Hero ── */}
      <div className="dashboard-hero" style={{ padding: '52px 48px 44px', maxWidth: '1080px', margin: '0 auto' }}>
        <div className="dashboard-intro">
        {/* Tag */}
        <span
          style={{
            display: 'inline-block',
            fontSize: 'var(--text-xs)',
            fontFamily: 'var(--font-sans)',
            fontWeight: 700,
            padding: '5px 14px',
            borderRadius: 'var(--r-pill)',
            border: '1px solid var(--green-600)',
            color: 'var(--green-600)',
            letterSpacing: '.1em',
            textTransform: 'uppercase',
            marginBottom: '20px',
          }}
        >
          Mémoire familiale
        </span>

        {/* H1 */}
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(40px, 5vw, 58px)',
            fontWeight: 500,
            color: 'var(--ink-900)',
            letterSpacing: 'var(--track-tight)',
            lineHeight: 'var(--lh-tight)',
            margin: '0 0 14px',
          }}
        >
          Votre famille,<br />au fil du temps.
        </h1>

        {/* Sous-titre */}
        <p
          style={{
            fontSize: 'var(--text-base)',
            color: 'var(--ink-secondary)',
            marginBottom: '40px',
            maxWidth: '560px',
            lineHeight: 'var(--lh-body)',
          }}
        >
          Explorez l&apos;arbre de la famille Dudouyt — des percepteurs de la Manche aux Mercader de Barcelone et Santiago de Cuba.
        </p>

        </div><PersonalJourney />
        {/* Stats en colonnes */}
        <div className="dashboard-stats" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', gap: 0, paddingTop: '24px', borderTop: '1px solid var(--line)' }}>
          {[
            { value: stats.totalPersons, label: 'Personnes' },
            { value: stats.totalFamilies, label: 'Familles' },
            {
              value: stats.minYear && stats.maxYear ? `${stats.minYear}–${stats.maxYear}` : '–',
              label: 'Période',
            },
            { value: stats.totalCountries ?? '–', label: 'Pays renseignés' },
          ].map((stat, i) => (
            <div key={stat.label} style={{ display: 'flex', alignItems: 'stretch' }}>
              {i > 0 && (
                <div className="stat-divider"
                  style={{
                    alignSelf: 'stretch',
                    width: '1px',
                    margin: '0 28px',
                    background: 'var(--line-strong)',
                  }}
                />
              )}
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '38px',
                    fontWeight: 500,
                    color: 'var(--ink-900)',
                    letterSpacing: 'var(--track-tight)',
                    lineHeight: 1,
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--ink-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: 'var(--track-label)',
                    fontWeight: 700,
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

      <div className="dashboard-journey">{story && <section className="story-card">{story.photoUrl && <img className="story-photo" src={story.photoUrl} alt={`Portrait de ${story.displayName}`} />}<div><p className="eyebrow">Une vie à découvrir</p><h2>{story.displayName}</h2><p>{story.notes?.slice(0, 220) || `${story.displayName} (${story.birthYear}–${story.deathYear}). ${story.occupations.join(', ')}. Découvrez les événements et les lieux renseignés dans sa fiche.`}{(story.notes?.length ?? 0) > 220 ? '…' : ''}</p><Link className="secondary-action" href={`/person/${story.id}`}>Découvrir son histoire et ses documents →</Link></div></section>}</div>

      {/* ── Ce jour-là / Parcours migratoires ── */}
      <div className="dashboard-content" style={{ maxWidth: '1080px', margin: '0 auto', padding: '0 48px 30px' }}>
        <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
          <OnThisDay />
          <MigrationHighlight
            totalCountries={stats.totalCountries}
            crossBorderJourneys={stats.crossBorderJourneys}
            minYear={stats.minYear}
          />
        </div>
      </div>

      {/* ── Section principale ── */}
      <div className="dashboard-content"
        style={{
          maxWidth: '1080px',
          margin: '0 auto',
          padding: '0 48px 60px',
        }}
      >

        {/* Grille navigation rapide */}
        <div className="dashboard-grid"
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
                borderRadius: 'var(--r-card)',
                border: '1px solid',
                textDecoration: 'none',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  background: 'var(--ok-bg)',
                  color: 'var(--green-600)',
                }}
              >
                {card.iconPath}
              </div>
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 600,
                    color: 'var(--ink-900)',
                    margin: 0,
                  }}
                >
                  {card.title}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--ink-secondary)',
                    margin: '3px 0 0',
                  }}
                >
                  {card.subtitle}
                </p>
              </div>
              <svg width="14" height="14" viewBox="0 0 14 14" style={{ flexShrink: 0, color: 'var(--ink-400)', opacity: 0.7 }}>
                <path d="M4 2l6 5-6 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          ))}
        </div>

        {/* Grille principale 2 colonnes */}
        <div className="dashboard-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.35fr 1fr',
            gap: '30px',
          }}
        >

          {/* Colonne gauche — Noms de famille */}
          <div
            style={{
              background: 'var(--paper-card)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--r-card)',
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
                  color: 'var(--ink-900)',
                  margin: 0,
                }}
              >
                Noms de famille
              </h2>
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--ink-secondary)',
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
                  background: 'var(--paper-card)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--r-card)',
                  padding: '24px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    marginBottom: '20px',
                  }}
                >
                  <h2
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '18px',
                      fontWeight: 500,
                      color: 'var(--ink-900)',
                      margin: 0,
                    }}
                  >
                    Répartition par siècle
                  </h2>
                  <a
                    href="/stats"
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 700,
                      color: 'var(--green-600)',
                      textDecoration: 'none',
                    }}
                  >
                    Toutes les statistiques →
                  </a>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {stats.centuries.map(c => (
                    <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span
                        style={{
                          width: '74px',
                          flexShrink: 0,
                          textAlign: 'right',
                          fontSize: 'var(--text-xs)',
                          color: 'var(--ink-secondary)',
                          fontFamily: 'var(--font-sans)',
                        }}
                      >
                        {c.label}
                      </span>
                      <div
                        style={{
                          flex: 1,
                          height: '9px',
                          borderRadius: 'var(--r-pill)',
                          overflow: 'hidden',
                          background: 'var(--line-soft)',
                        }}
                      >
                        <div
                          style={{
                            width: `${(c.count / centuryMax) * 100}%`,
                            height: '100%',
                            borderRadius: 'var(--r-pill)',
                            background: 'linear-gradient(90deg, var(--green-600), var(--green-400))',
                          }}
                        />
                      </div>
                      <span
                        style={{
                          width: '28px',
                          flexShrink: 0,
                          textAlign: 'right',
                          fontSize: 'var(--text-xs)',
                          fontWeight: 700,
                          color: 'var(--ink-secondary)',
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
                  background: 'var(--paper-card)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--r-card)',
                  padding: '24px',
                }}
              >
                <h2
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '18px',
                    fontWeight: 500,
                    color: 'var(--ink-900)',
                    margin: '0 0 16px',
                  }}
                >
                  Dernières modifications
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
                          borderRadius: 'var(--r-md)',
                          textDecoration: 'none',
                        }}
                      >
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            fontSize: 'var(--text-sm)',
                            fontWeight: 700,
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
                              fontSize: 'var(--text-sm)',
                              fontWeight: 600,
                              color: 'var(--ink-900)',
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
                                fontSize: 'var(--text-xs)',
                                color: 'var(--ink-secondary)',
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
