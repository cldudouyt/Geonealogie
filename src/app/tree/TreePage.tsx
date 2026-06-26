'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { TreeData } from '@/lib/types';
import TreeVertical from '@/components/tree/TreeVertical';
import TreeRadial from '@/components/tree/TreeRadial';
import TreeListeSosa from '@/components/tree/TreeListeSosa';

interface PersonSuggestion {
  id: string;
  displayName: string;
  birthYear?: string;
  birthPlace?: string;
}

function PersonSearch({ onSelect }: { onSelect: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PersonSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    if (!value.trim()) { setSuggestions([]); setShowDropdown(false); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/persons?q=${encodeURIComponent(value)}&autocomplete=true&limit=8`);
        const data = await res.json();
        setSuggestions(data.persons || []);
        setShowDropdown(true);
      } finally {
        setSearching(false);
      }
    }, 280);
  }

  function select(person: PersonSuggestion) {
    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    onSelect(person.id);
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', marginBottom: 14 }}>
      <div style={{ position: 'relative' }}>
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          color: '#9a9080', pointerEvents: 'none',
        }}>
          <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.4"/>
          <line x1="10.5" y1="10.5" x2="13.5" y2="13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        <input
          type="text"
          placeholder="Centrer l'arbre sur une personne…"
          value={query}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
          style={{
            width: '100%', height: 40, borderRadius: 11,
            border: '1px solid #e0d8c6', padding: '0 36px 0 34px',
            fontSize: 13.5, fontFamily: 'inherit',
            background: '#fffdf9', color: '#1c1f1c',
            outline: 'none', boxSizing: 'border-box',
            transition: 'border-color .15s, box-shadow .15s',
          }}
          onFocusCapture={e => { e.currentTarget.style.borderColor = '#2f5142'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(47,81,66,.12)'; }}
          onBlurCapture={e => { e.currentTarget.style.borderColor = '#e0d8c6'; e.currentTarget.style.boxShadow = 'none'; }}
        />
        {searching && (
          <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#9a9080' }}>…</span>
        )}
        {!searching && query && (
          <button type="button" onClick={() => { setQuery(''); setSuggestions([]); setShowDropdown(false); }}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 3, color: '#9a9080', fontSize: 15 }}>
            ✕
          </button>
        )}
      </div>
      {showDropdown && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: '#fffdf9', border: '1px solid #e0d8c6', borderRadius: 12,
          boxShadow: '0 8px 24px -8px rgba(0,0,0,.18)', zIndex: 200, overflow: 'hidden',
        }}>
          {suggestions.map((p, i) => (
            <button key={p.id} type="button" onMouseDown={() => select(p)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '10px 14px', background: 'none', border: 'none',
                borderBottom: i < suggestions.length - 1 ? '1px solid #f0ece4' : 'none',
                cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f7f3ea')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1c1f1c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.displayName}
                </div>
                {(p.birthYear || p.birthPlace) && (
                  <div style={{ fontSize: 11.5, color: '#8a8474', marginTop: 1 }}>
                    {[p.birthYear, p.birthPlace].filter(Boolean).join(' · ')}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
      {showDropdown && suggestions.length === 0 && !searching && query && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: '#fffdf9', border: '1px solid #e0d8c6', borderRadius: 12,
          boxShadow: '0 8px 24px -8px rgba(0,0,0,.18)', zIndex: 200, padding: '12px 14px',
          fontSize: 13, color: '#9a9080',
        }}>
          Aucun résultat
        </div>
      )}
    </div>
  );
}

/* ── Types & constants ───────────────────────────────────────── */
type ViewMode = 'vertical' | 'fan' | 'wheel' | 'liste';

const TABS: { id: ViewMode; label: string }[] = [
  { id: 'vertical', label: 'Vertical' },
  { id: 'fan',      label: 'Éventail' },
  { id: 'wheel',    label: 'Roue' },
  { id: 'liste',    label: 'Liste' },
];

/* ── Dot-grid background ─────────────────────────────────────── */
const DOT_GRID: React.CSSProperties = {
  backgroundImage: 'radial-gradient(#e4dcc8 1px, transparent 1px)',
  backgroundSize: '22px 22px',
  backgroundColor: '#fbf9f3',
};

/* ── Legend ──────────────────────────────────────────────────── */
function Legend() {
  const items = [
    { color: '#5b7da3', label: 'Hommes' },
    { color: '#b5736b', label: 'Femmes' },
    { color: '#1e3a2f', label: 'Personne centrale' },
  ];
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 18,
      flexWrap: 'wrap',
    }}>
      {items.map(({ color, label }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 12,
            height: 12,
            borderRadius: 3,
            background: color,
            flexShrink: 0,
          }} />
          <span style={{ fontSize: 12, color: '#6c7064' }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Main page component ─────────────────────────────────────── */
export default function TreePage({ defaultFocusId }: { defaultFocusId: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const focusId = searchParams.get('focus') ?? defaultFocusId;
  const viewParam = searchParams.get('view') as ViewMode | null;
  const view: ViewMode = TABS.some(t => t.id === viewParam) ? viewParam! : 'vertical';

  const [treeData, setTreeData] = useState<TreeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const loadTree = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tree/${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error('Échec du chargement');
      const data: TreeData = await res.json();
      setTreeData(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTree(focusId);
  }, [focusId, loadTree]);

  const switchView = (v: ViewMode) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', v);
    router.push(`/tree?${params.toString()}`, { scroll: false });
  };

  const onFocus = useCallback((id: string) => {
    const params = new URLSearchParams();
    params.set('focus', id);
    params.set('view', view);
    router.push(`/tree?${params.toString()}`, { scroll: false });
  }, [router, view]);

  const focusName = treeData
    ? (treeData.nodes.find(n => n.id === treeData.rootId)?.displayName ?? '')
    : '';

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ── Page header ─────────────────────────────────────── */}
      <div style={{ padding: '28px 32px 16px' }}>
        <h1 style={{
          fontFamily: 'var(--font-serif, Georgia, serif)',
          fontSize: 30,
          fontWeight: 500,
          letterSpacing: '-.02em',
          color: '#1c1f1c',
          margin: 0,
          lineHeight: 1.2,
        }}>
          Arbre généalogique
        </h1>
        <p style={{ fontSize: 13.5, color: '#8a8474', margin: '6px 0 16px' }}>
          Cliquez sur une personne pour recentrer l&apos;arbre sur elle.
        </p>

        <PersonSearch onSelect={onFocus} />

        {/* Mode selector */}
        <div style={{ marginTop: 0 }}>
          <div style={{
            display: 'inline-flex',
            background: '#ece5d5',
            borderRadius: 12,
            padding: 4,
            gap: 2,
          }}>
            {TABS.map(tab => {
              const active = view === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => switchView(tab.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 999,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: active ? 600 : 500,
                    fontFamily: 'inherit',
                    transition: 'background .15s, color .15s',
                    background: active ? '#1e3a2f' : 'transparent',
                    color: active ? '#f1ede2' : '#6c7064',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Focus person card ────────────────────────────────── */}
      {treeData && !loading && !error && (() => {
        const focusNode = treeData.nodes.find(n => n.id === treeData.rootId) ?? treeData.nodes.find(n => n.id === focusId);
        if (!focusNode) return null;
        const sex = focusNode.sex ?? 'U';
        const avatarBg = sex === 'M' ? '#dde7f1' : sex === 'F' ? '#f3e1de' : '#eef2ec';
        const avatarColor = sex === 'M' ? '#3f617f' : sex === 'F' ? '#9c5a52' : '#2f5142';
        const parts = focusNode.displayName.trim().split(/\s+/).filter(Boolean);
        const initials = parts.length >= 2
          ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
          : parts[0]?.slice(0, 2).toUpperCase() ?? '?';
        const firstName = parts[0] ?? focusNode.displayName;
        const meta = [
          focusNode.birthYear && focusNode.deathYear ? `${focusNode.birthYear} – ${focusNode.deathYear}` : focusNode.birthYear ?? null,
        ].filter(Boolean).join(' · ');
        return (
          <div style={{ padding: '0 32px 16px' }}>
            <div style={{
              background: '#fffdf9',
              border: '1px solid #e7e0d0',
              borderRadius: 16,
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              marginBottom: 14,
            }}>
              {/* Avatar */}
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: avatarBg, color: avatarColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-serif)', fontSize: 19, fontWeight: 600, flexShrink: 0,
              }}>
                {initials}
              </div>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 500, color: '#1c1f1c' }}>
                    {focusNode.displayName}
                  </span>
                  <span style={{
                    background: '#eef2ec', color: '#2f5142', borderRadius: 999,
                    padding: '2px 10px', fontSize: 11, fontWeight: 600,
                  }}>
                    Centre de l&apos;arbre
                  </span>
                </div>
                {meta && <div style={{ fontSize: 13, color: '#8a8474', marginTop: 2 }}>{meta}</div>}
              </div>
              {/* Buttons */}
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => onFocus(focusId)}
                  style={{
                    height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid #e0d8c6',
                    background: '#fffdf9', color: '#3a4038', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 4v6h6"/><path d="M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
                  Recentrer sur {firstName}
                </button>
                <Link
                  href={`/person/${focusId}`}
                  style={{
                    height: 36, padding: '0 14px', borderRadius: 10, border: 'none',
                    background: '#1e3a2f', color: '#f1ede2', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                    textDecoration: 'none', whiteSpace: 'nowrap',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                  Voir la fiche
                </Link>
              </div>
            </div>
            {/* Navigation breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', color: '#9a9080', textTransform: 'uppercase' }}>
                Navigation
              </span>
              <span style={{ background: '#1e3a2f', color: '#f4efe3', borderRadius: 999, padding: '3px 12px', fontSize: 12, fontWeight: 600 }}>
                {firstName}
              </span>
            </div>
          </div>
        );
      })()}

      {/* ── Tree area ────────────────────────────────────────── */}
      <div style={{ flex: 1, padding: '0 32px 32px' }}>
        {!focusId && !loading && (
          <div style={{
            ...DOT_GRID,
            borderRadius: 20,
            border: '1px solid #e9e2d2',
            padding: 40,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 300,
            gap: 12,
          }}>
            <p style={{ fontSize: 15, color: '#8a8474', margin: 0 }}>
              Sélectionnez une personne via la{' '}
              <a href="/search" style={{ color: '#2f5142', textDecoration: 'underline' }}>
                recherche
              </a>{' '}
              pour centrer l'arbre.
            </p>
          </div>
        )}

        {loading && (
          <div style={{
            ...DOT_GRID,
            borderRadius: 20,
            border: '1px solid #e9e2d2',
            minHeight: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 32,
                height: 32,
                border: '3px solid #e9e2d2',
                borderTopColor: '#2f5142',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
              }} />
              <p style={{ fontSize: 13.5, color: '#8a8474', margin: 0 }}>
                Chargement de l'arbre…
              </p>
            </div>
          </div>
        )}

        {error && (
          <div style={{
            background: '#fae6e3',
            border: '1px solid #d98b82',
            borderRadius: 16,
            padding: '24px 28px',
          }}>
            <p style={{ fontSize: 14, color: '#b03a2e', margin: '0 0 8px', fontWeight: 600 }}>
              Erreur de chargement
            </p>
            <p style={{ fontSize: 13, color: '#b03a2e', margin: '0 0 14px' }}>{error}</p>
            <button
              onClick={() => loadTree(focusId)}
              style={{
                padding: '8px 16px',
                background: '#1e3a2f',
                color: '#f1ede2',
                border: 'none',
                borderRadius: 10,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Réessayer
            </button>
          </div>
        )}

        {treeData && !loading && !error && (
          <div
            style={{
              ...DOT_GRID,
              borderRadius: 20,
              border: '1px solid #e9e2d2',
            }}
          >
            {view === 'vertical' && (
              <TreeVertical treeData={treeData} focusId={focusId} onFocus={onFocus} />
            )}
            {(view === 'fan' || view === 'wheel') && (
              <TreeRadial treeData={treeData} mode={view} onFocus={onFocus} />
            )}
            {view === 'liste' && (
              <div style={{ padding: 24 }}>
                <TreeListeSosa treeData={treeData} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Legend ───────────────────────────────────────────── */}
      {treeData && !loading && !error && (
        <div style={{ padding: '0 32px 28px' }}>
          <Legend />
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
