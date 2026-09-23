'use client';

import { useState, useCallback, useEffect, useRef, useId } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { PersonSummary } from '@/lib/types';
import { Button } from '@/components/ui/Button';

interface ArchiveInfo {
  key: string;
  name: string;
  description: string;
  searchUrl: string;
  apiPath: string;
}

const ARCHIVES: ArchiveInfo[] = [
  {
    key: 'bnf',
    name: 'BnF Gallica',
    description: 'Presse & registres numérisés',
    searchUrl: 'https://gallica.bnf.fr/recherche/simple?q=',
    apiPath: '/api/research/bnf',
  },
  {
    key: 'maitron',
    name: 'Le Maitron',
    description: 'Dictionnaire du mouvement ouvrier',
    searchUrl: 'https://maitron.fr/spip.php?recherche=',
    apiPath: '/api/research/maitron',
  },
  {
    key: 'viaf',
    name: 'VIAF',
    description: "Fichier d'autorité international",
    searchUrl: 'https://viaf.org/search#query=cql.any+=+',
    apiPath: '/api/research/viaf',
  },
  {
    key: 'wikidata',
    name: 'Wikidata',
    description: 'Données ouvertes liées',
    searchUrl: 'https://www.wikidata.org/w/index.php?search=',
    apiPath: '/api/research/wikidata',
  },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatName(p: { givenNames?: string; surname?: string; displayName: string }): string {
  if (!p.givenNames) return p.displayName;
  const names = p.givenNames.replace(/,/g, ' ').trim().split(/\s+/).filter(Boolean);
  const given = names.join(' ');
  return p.surname ? `${given} ${p.surname}` : given;
}

function PersonCard({ person }: { person: PersonSummary }) {
  const isMale = person.sex === 'M';
  const isFemale = person.sex === 'F';
  const avatarBg = isMale ? '#e4ecf3' : isFemale ? '#f4e3e0' : '#eef2ec';
  const avatarColor = isMale ? '#3f617f' : isFemale ? '#9c5a52' : '#2f5142';

  const birthYear = person.birthDate ? person.birthDate.substring(0, 4) : null;
  const deathYear = person.deathDate ? person.deathDate.substring(0, 4) : null;

  let metaLine: string;
  if (birthYear && deathYear) {
    const parts: string[] = [];
    parts.push(birthYear);
    if (person.birthPlace) parts.push(person.birthPlace);
    const left = parts.join(' ');
    const rightParts: string[] = [deathYear];
    if (person.deathPlace) rightParts.push(person.deathPlace);
    metaLine = `${left} — ${rightParts.join(' ')}`;
  } else {
    const parts: string[] = [];
    if (birthYear) parts.push(birthYear);
    if (person.birthPlace) parts.push(person.birthPlace);
    if (person.occupation) parts.push(person.occupation);
    metaLine = parts.join(' · ');
  }

  return (
    <Link
      href={`/person/${person.id}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        border: '1px solid #e9e2d2',
        borderRadius: 14,
        padding: '15px 18px',
        background: '#fffdf9',
        textDecoration: 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = '#c9a86a';
        el.style.boxShadow = '0 8px 24px -16px rgba(30,58,47,.5)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = '#e9e2d2';
        el.style.boxShadow = 'none';
      }}
    >
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: '50%',
          background: avatarBg,
          color: avatarColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-serif, Georgia, serif)',
          fontSize: 17,
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {getInitials(person.displayName)}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: '#1c1f1c',
            margin: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {formatName(person)}
        </p>
        {metaLine && (
          <p
            style={{
              fontSize: 12.5,
              color: '#8a8474',
              margin: '2px 0 0',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {metaLine}
          </p>
        )}
      </div>

      <span
        style={{
          borderRadius: 999,
          background: '#eef2ec',
          color: '#2f5142',
          fontSize: 11,
          fontWeight: 700,
          padding: '3px 9px',
          flexShrink: 0,
        }}
      >
        Personne
      </span>
    </Link>
  );
}

interface ArchiveHits {
  [key: string]: number | null;
}

function ArchiveCard({
  archive,
  query,
  hits,
  loading,
}: {
  archive: ArchiveInfo;
  query: string;
  hits: number | null;
  loading: boolean;
}) {
  return (
    <a
      href={query ? `${archive.searchUrl}${encodeURIComponent(query)}` : '#'}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        border: '1px solid #e9e2d2',
        borderRadius: 14,
        padding: 17,
        background: '#fffdf9',
        textDecoration: 'none',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = '#c9a86a';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = '#e9e2d2';
      }}
    >
      <p style={{ fontSize: 14, fontWeight: 700, color: '#1c1f1c', margin: '0 0 4px' }}>
        {archive.name}
      </p>
      <p style={{ fontSize: 11.5, color: '#8a8474', margin: '0 0 10px' }}>
        {archive.description}
      </p>
      <p style={{ fontSize: 11.5, fontWeight: 700, color: '#2f5142', margin: 0 }}>
        {loading
          ? '…'
          : hits === null
          ? '— résultats →'
          : `${hits} résultat${hits !== 1 ? 's' : ''} →`}
      </p>
    </a>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 44,
  padding: '0 14px',
  border: '1px solid #e0d8c6',
  borderRadius: 11,
  background: '#fffdf9',
  fontSize: 16,
  color: '#1c1f1c',
  outline: 'none',
  boxSizing: 'border-box',
};

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  min?: number;
  max?: number;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1c1f1c', marginBottom: 6 }}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        style={inputStyle}
        onFocus={(e) => {
          e.target.style.borderColor = '#2f5142';
          e.target.style.boxShadow = '0 0 0 3px rgba(47,81,66,.12)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = '#e0d8c6';
          e.target.style.boxShadow = 'none';
        }}
      />
    </div>
  );
}

export default function SearchPage() {
  const params = useSearchParams();
  return <SearchForm key={params.toString()} initialParams={params.toString()} />;
}

function SearchForm({ initialParams }: { initialParams: string }) {
  const router = useRouter();
  const searchParams = new URLSearchParams(initialParams);
  const initialQ = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQ);
  const [surname, setSurname] = useState(searchParams.get('surname') || '');
  const [place, setPlace] = useState(searchParams.get('place') || '');
  const [occupation, setOccupation] = useState(searchParams.get('occupation') || '');
  const [sex, setSex] = useState(searchParams.get('sex') || '');
  const [birthFrom, setBirthFrom] = useState(searchParams.get('birthFrom') || '');
  const [birthTo, setBirthTo] = useState(searchParams.get('birthTo') || '');
  const [results, setResults] = useState<PersonSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(['surname','place','occupation','sex','birthFrom','birthTo'].some(key => searchParams.has(key)));
  const [archiveHits, setArchiveHits] = useState<ArchiveHits>({});
  const [archiveLoading, setArchiveLoading] = useState(false);
  const limit = 20;
  const requestVersion = useRef(0);
  const archiveVersion = useRef(0);

  const search = useCallback(
    async (pageNum: number = 1) => {
      const version = ++requestVersion.current;
      setLoading(true);
      setSearched(true);
      setSearchError(false);

      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (surname) params.set('surname', surname);
      if (place) params.set('place', place);
      if (occupation) params.set('occupation', occupation);
      if (sex) params.set('sex', sex);
      if (birthFrom) params.set('birthFrom', birthFrom);
      if (birthTo) params.set('birthTo', birthTo);
      params.set('page', String(pageNum));
      params.set('limit', String(limit));

      try {
        const res = await fetch(`/api/persons?${params}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (version !== requestVersion.current) return;
        setResults(data.persons || []);
        setTotal(data.total || 0);
        setCurrentPage(pageNum);
      } catch {
        if (version !== requestVersion.current) return;
        setResults([]);
        setTotal(0);
        setSearchError(true);
      } finally {
        if (version === requestVersion.current) setLoading(false);
      }
    },
    [query, surname, place, occupation, sex, birthFrom, birthTo]
  );

  const fetchArchiveHits = useCallback(async (q: string) => {
    const version = ++archiveVersion.current;
    if (!q.trim()) {
      setArchiveHits({});
      setArchiveLoading(false);
      return;
    }
    setArchiveLoading(true);
    const hits: ArchiveHits = {};
    await Promise.all(
      ARCHIVES.map(async (archive) => {
        try {
          const res = await fetch(`${archive.apiPath}?q=${encodeURIComponent(q)}`);
          if (res.ok) {
            const data = await res.json();
            hits[archive.key] = Array.isArray(data.results) ? data.results.length : 0;
          } else {
            hits[archive.key] = null;
          }
        } catch {
          hits[archive.key] = null;
        }
      })
    );
    if (version !== archiveVersion.current) return;
    setArchiveHits(hits);
    setArchiveLoading(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(initialParams);
    for (const [key, value] of Object.entries({ q: query.trim(), surname, place, occupation, sex, birthFrom, birthTo })) {
      if (value) next.set(key, value); else next.delete(key);
    }
    next.delete('page');
    if (next.toString() === initialParams) { search(1); fetchArchiveHits(query); }
    else router.push(`/search${next.size ? '?' + next.toString() : ''}`, { scroll: false });
  };

  useEffect(() => {
    if (!['q','surname','place','occupation','sex','birthFrom','birthTo'].some(key => searchParams.get(key))) return;
    const version = ++requestVersion.current;
    setSearched(true);
    setLoading(true);
    setSearchError(false);
    const params = new URLSearchParams(initialParams);
    params.set('page', '1'); params.set('limit', String(limit));
    fetch(`/api/persons?${params}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        if (version !== requestVersion.current) return;
        setResults(data.persons || []);
        setTotal(data.total || 0);
        setCurrentPage(1);
      })
      .catch(() => {
        if (version !== requestVersion.current) return;
        setResults([]);
        setTotal(0);
        setSearchError(true);
      })
      .finally(() => { if (version === requestVersion.current) setLoading(false); });
    fetchArchiveHits(initialQ);
    // These refs are request counters, not DOM nodes: invalidate all in-flight responses.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { ++requestVersion.current; ++archiveVersion.current; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showArchives = searched || !!initialQ;

  return (
    <div style={{ minHeight: '100vh', background: '#f4f1ea' }}>
      <main style={{ maxWidth: 980, margin: '0 auto', padding: '40px 24px 60px' }}>
        <div style={{ marginBottom: 28 }}>
          <h1
            style={{
              fontFamily: 'var(--font-serif, Georgia, serif)',
              fontSize: 30,
              fontWeight: 500,
              color: '#1c1f1c',
              margin: '0 0 6px',
              letterSpacing: '-0.02em',
            }}
          >
            {searchParams.get('choose') === 'me' ? 'Retrouvez votre fiche' : 'Recherche'}
          </h1>
          {searchParams.get('choose') === 'me' && <p className="empty-state">Recherchez votre nom, ouvrez votre fiche puis choisissez « C’est moi / choisir comme point de départ ».</p>}
          <p style={{ fontSize: 13.5, color: '#6c7064', margin: 0 }}>
            Dans l&apos;arbre et les archives externes (BnF, Maitron, VIAF, Wikidata).
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            background: '#fffdf9',
            border: '1px solid #e7e0d0',
            borderRadius: 16,
            padding: 20,
            marginBottom: 24,
          }}
        >
          {/* Search bar — always visible */}
          <div className="search-bar-row">
            <div style={{ position: 'relative', flex: 1 }}>
              <svg style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9a9384" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nom, prénom, lieu, date…"
                style={{ ...inputStyle, paddingLeft: 38 }}
                onFocus={(e) => { e.target.style.borderColor = '#2f5142'; e.target.style.boxShadow = '0 0 0 3px rgba(47,81,66,.12)'; }}
                onBlur={(e) => { e.target.style.borderColor = '#e0d8c6'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
            <div className="search-bar-actions">
              <Button type="submit" variant="primary" disabled={loading} style={{ height: 44, flex: 1 }}>
                {loading ? 'Recherche…' : 'Rechercher'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowAdvanced(v => !v)}
                style={{ height: 44 }}
                icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M7 12h10M10 18h4"/></svg>}
              >
                {showAdvanced ? 'Réduire' : 'Filtres'}
              </Button>
            </div>
          </div>

          {/* Advanced filters — collapsible */}
          {showAdvanced && (
            <div className="search-filters-grid" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0ece2' }}>
              <InputField label="Nom de famille" value={surname} onChange={setSurname} placeholder="DUDOUYT" />
              <InputField label="Lieu" value={place} onChange={setPlace} placeholder="Paris, Bretagne…" />
              <InputField label="Profession" value={occupation} onChange={setOccupation} placeholder="Cultivateur, notaire…" />
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1c1f1c', marginBottom: 6 }}>Sexe</label>
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  onFocus={(e) => { e.target.style.borderColor = '#2f5142'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#e0d8c6'; }}
                >
                  <option value="">Tous</option>
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                  <option value="U">Inconnu</option>
                </select>
              </div>
              <InputField label="Naissance — de" value={birthFrom} onChange={setBirthFrom} placeholder="1800" type="number" min={1000} max={2100} />
              <InputField label="Naissance — à" value={birthTo} onChange={setBirthTo} placeholder="1950" type="number" min={1000} max={2100} />
            </div>
          )}
        </form>

        {searched && (
          <section style={{ marginBottom: 32, animation: 'geo-fade .4s ease both' }}>
            <p style={{ fontSize: 13, color: '#8a8474', margin: '0 0 12px' }}>
              {total} résultat{total !== 1 ? 's' : ''}
              {query ? ` pour « ${query} »` : ''}
            </p>

            {searchError && !loading ? (
              <div
                role="alert"
                style={{
                  background: '#fffdf9',
                  border: '1px solid #e9e2d2',
                  borderRadius: 16,
                  padding: '48px 24px',
                  textAlign: 'center',
                  color: '#8a8474',
                  fontSize: 14,
                }}
              >
                <p style={{ margin: '0 0 16px' }}>La recherche a échoué — vérifiez votre connexion puis réessayez.</p>
                <button className="primary-action" onClick={() => search(currentPage)}>Réessayer</button>
              </div>
            ) : results.length === 0 && !loading ? (
              <div
                style={{
                  background: '#fffdf9',
                  border: '1px solid #e9e2d2',
                  borderRadius: 16,
                  padding: '48px 24px',
                  textAlign: 'center',
                  color: '#8a8474',
                  fontSize: 14,
                }}
              >
                Aucun résultat pour{query ? ` « ${query} »` : ' cette recherche'} — essayez un autre terme.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 16,
                          border: '1px solid #e9e2d2',
                          borderRadius: 14,
                          padding: '15px 18px',
                          background: '#fffdf9',
                          opacity: 0.5,
                        }}
                      >
                        <div style={{ width: 46, height: 46, borderRadius: 12, background: '#e9e2d2', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ height: 14, background: '#e9e2d2', borderRadius: 4, width: '40%', marginBottom: 8 }} />
                          <div style={{ height: 11, background: '#e9e2d2', borderRadius: 4, width: '60%' }} />
                        </div>
                      </div>
                    ))
                  : results.map((person) => <PersonCard key={person.id} person={person} />)}
              </div>
            )}

            {total > limit && !loading && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  marginTop: 20,
                }}
              >
                <button
                  onClick={() => search(currentPage - 1)}
                  disabled={currentPage <= 1}
                  style={{
                    padding: '6px 16px',
                    border: '1px solid #e0d8c6',
                    borderRadius: 8,
                    background: '#fffdf9',
                    fontSize: 13,
                    color: '#1c1f1c',
                    cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage <= 1 ? 0.3 : 1,
                  }}
                >
                  Précédent
                </button>
                <span style={{ fontSize: 13, color: '#8a8474' }}>
                  Page {currentPage} / {Math.ceil(total / limit)}
                </span>
                <button
                  onClick={() => search(currentPage + 1)}
                  disabled={currentPage * limit >= total}
                  style={{
                    padding: '6px 16px',
                    border: '1px solid #e0d8c6',
                    borderRadius: 8,
                    background: '#fffdf9',
                    fontSize: 13,
                    color: '#1c1f1c',
                    cursor: currentPage * limit >= total ? 'not-allowed' : 'pointer',
                    opacity: currentPage * limit >= total ? 0.3 : 1,
                  }}
                >
                  Suivant
                </button>
              </div>
            )}
          </section>
        )}

        {showArchives && (
          <section style={{ animation: 'geo-fade .4s ease both' }}>
            <h2
              style={{
                fontFamily: 'var(--font-serif, Georgia, serif)',
                fontSize: 19,
                fontWeight: 500,
                color: '#1c1f1c',
                margin: '0 0 14px',
                letterSpacing: '-0.02em',
              }}
            >
              Archives externes
            </h2>
            <div className="archives-grid">
              {ARCHIVES.map((archive) => (
                <ArchiveCard
                  key={archive.key}
                  archive={archive}
                  query={query}
                  hits={archiveHits[archive.key] ?? null}
                  loading={archiveLoading}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      <style>{`
        @keyframes geo-fade {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: none; }
        }
        .search-bar-row {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .search-bar-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }
        .search-filters-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .archives-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 13px;
        }
        @media (max-width: 640px) {
          .search-bar-row {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }
          .search-bar-actions {
            flex-shrink: unset;
          }
          .search-filters-grid {
            grid-template-columns: 1fr;
          }
          .archives-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </div>
  );
}
