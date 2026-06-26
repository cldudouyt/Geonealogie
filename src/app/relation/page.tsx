'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { PersonSummary } from '@/lib/types';
import { Button } from '@/components/ui/Button';

interface PathNode {
  id: string;
  name: string;
  sex: 'M' | 'F' | 'U';
  birthYear?: string;
  deathYear?: string;
  photoUrl?: string;
  relToNext?: string;
}

interface RelationResult {
  path: PathNode[] | null;
  relationship: string | null;
  degree: number | null;
  samePerson?: boolean;
}

function useAutocomplete(onSelect: (id: string, name: string) => void) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PersonSummary[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedName, setSelectedName] = useState('');
  const [selectedId, setSelectedId] = useState('');

  const search = useCallback(async (q: string) => {
    setQuery(q);
    setSelectedId('');
    setSelectedName('');
    if (q.length < 2) { setSuggestions([]); setOpen(false); return; }
    const res = await fetch(`/api/persons?autocomplete=true&q=${encodeURIComponent(q)}&limit=8`);
    const data = await res.json();
    setSuggestions(data.persons || []);
    setOpen(true);
  }, []);

  const pick = useCallback((p: PersonSummary) => {
    setSelectedId(p.id);
    setSelectedName(p.displayName);
    setQuery(p.displayName);
    setSuggestions([]);
    setOpen(false);
    onSelect(p.id, p.displayName);
  }, [onSelect]);

  const setById = useCallback((id: string, name: string) => {
    setSelectedId(id);
    setSelectedName(name);
    setQuery(name);
  }, []);

  return { query, search, suggestions, open, pick, selectedId, selectedName, setById, setOpen };
}

function Avatar({ person }: { person: { name: string; sex: 'M' | 'F' | 'U'; photoUrl?: string } }) {
  const initials = person.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

  const bg = person.sex === 'M' ? '#e4ecf3' : person.sex === 'F' ? '#f4e3e0' : '#f0ece4';
  const color = person.sex === 'M' ? '#3f617f' : person.sex === 'F' ? '#9c5a52' : '#6b5e48';

  if (person.photoUrl) {
    return (
      <div
        className="rounded-full overflow-hidden shrink-0 border-2"
        style={{ width: 40, height: 40, borderColor: bg }}
      >
        <Image
          src={person.photoUrl}
          alt={person.name}
          width={40}
          height={40}
          className="object-cover w-full h-full"
        />
      </div>
    );
  }

  return (
    <div
      className="rounded-full shrink-0 flex items-center justify-center text-sm font-bold"
      style={{ width: 40, height: 40, background: bg, color }}
    >
      {initials}
    </div>
  );
}

function PersonCard({
  label,
  selectedId,
  selectedName,
  onClick,
}: {
  label: string;
  selectedId: string;
  selectedName: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 text-left transition-colors hover:border-[#c9a86a] w-full"
      style={{
        minWidth: '220px',
        background: '#fffdf9',
        border: '1px solid #e0d8c6',
        borderRadius: '13px',
        padding: '12px 15px',
      }}
    >
      <div
        style={{
          fontSize: '10.5px',
          textTransform: 'uppercase',
          color: '#9a9080',
          letterSpacing: '.06em',
          marginBottom: '4px',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: '14.5px',
          fontWeight: 700,
          color: selectedId ? '#1c1f1c' : '#9a9080',
        }}
      >
        {selectedName || 'Choisir une personne…'}
      </div>
    </button>
  );
}

function SearchDropdown({
  hook,
  onClose,
}: {
  hook: ReturnType<typeof useAutocomplete>;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        autoFocus
        type="text"
        value={hook.query}
        onChange={e => hook.search(e.target.value)}
        placeholder="Tapez un nom…"
        className="w-full outline-none"
        style={{
          height: '40px',
          padding: '0 14px',
          border: '1.5px solid #2f5142',
          borderRadius: '11px',
          background: '#fffdf9',
          fontSize: '14px',
          boxShadow: '0 0 0 3px rgba(47,81,66,.1)',
          color: '#1c1f1c',
        }}
      />
      {hook.open && hook.suggestions.length > 0 && (
        <ul
          style={{
            position: 'absolute',
            zIndex: 30,
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            background: '#fffdf9',
            border: '1px solid #e7e0d0',
            borderRadius: '11px',
            boxShadow: '0 8px 24px rgba(0,0,0,.1)',
            overflow: 'hidden',
            listStyle: 'none',
            padding: 0,
          }}
        >
          {hook.suggestions.map(p => (
            <li key={p.id}>
              <button
                type="button"
                onMouseDown={() => hook.pick(p)}
                className="w-full text-left"
                style={{
                  padding: '8px 14px',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f3efe5')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#1c1f1c' }}>{p.displayName}</span>
                {p.birthDate && (
                  <span style={{ fontSize: '12px', color: '#8a8474' }}>{p.birthDate.substring(0, 4)}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function RelationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [fromId, setFromId] = useState(searchParams.get('from') || '');
  const [toId, setToId] = useState(searchParams.get('to') || '');
  const [result, setResult] = useState<RelationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingFrom, setEditingFrom] = useState(false);
  const [editingTo, setEditingTo] = useState(false);

  const updateUrl = useCallback((fid: string, tid: string) => {
    const params = new URLSearchParams();
    if (fid) params.set('from', fid);
    if (tid) params.set('to', tid);
    router.replace(`/relation?${params.toString()}`, { scroll: false });
  }, [router]);

  const from = useAutocomplete(useCallback((id: string) => {
    setFromId(id);
    setEditingFrom(false);
  }, []));

  const to = useAutocomplete(useCallback((id: string) => {
    setToId(id);
    setEditingTo(false);
  }, []));

  // Load person names for initial URL params
  useEffect(() => {
    const initialFrom = searchParams.get('from');
    const initialTo = searchParams.get('to');

    async function loadNames() {
      if (initialFrom) {
        const res = await fetch(`/api/persons/${initialFrom}`);
        if (res.ok) {
          const data = await res.json();
          const name = data.person?.displayName || initialFrom;
          from.setById(initialFrom, name);
        }
      }
      if (initialTo) {
        const res = await fetch(`/api/persons/${initialTo}`);
        if (res.ok) {
          const data = await res.json();
          const name = data.person?.displayName || initialTo;
          to.setById(initialTo, name);
        }
      }
    }

    if (initialFrom || initialTo) {
      loadNames();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doFind = useCallback(async (fid: string, tid: string) => {
    if (!fid || !tid) return;
    setLoading(true);
    setResult(null);
    const res = await fetch(`/api/relation?from=${fid}&to=${tid}`);
    const data = await res.json();
    setResult(data);
    setLoading(false);
  }, []);

  // Auto-search when both IDs are set from URL on mount
  useEffect(() => {
    const initialFrom = searchParams.get('from');
    const initialTo = searchParams.get('to');
    if (initialFrom && initialTo) {
      doFind(initialFrom, initialTo);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFind = () => {
    if (!fromId || !toId) return;
    updateUrl(fromId, toId);
    doFind(fromId, toId);
  };

  return (
    <div className="h-screen overflow-y-auto" style={{ background: '#f4f1ea' }}>
      <main className="mx-auto p-6 space-y-6" style={{ maxWidth: '900px' }}>
        {/* Header */}
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-serif, serif)',
              fontSize: '30px',
              fontWeight: 500,
              color: '#1c1f1c',
              letterSpacing: '-.02em',
              marginBottom: '6px',
            }}
          >
            Chemin de parenté
          </h1>
          <p style={{ fontSize: '13.5px', color: '#8a8474' }}>
            Le lien généalogique le plus court entre deux personnes.
          </p>
        </div>

        {/* Selector De → À */}
        <div
          style={{
            background: '#fffdf9',
            border: '1px solid #e7e0d0',
            borderRadius: '16px',
            padding: '20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            {/* From selector */}
            <div style={{ flex: 1, minWidth: '220px' }}>
              {editingFrom ? (
                <SearchDropdown hook={from} onClose={() => setEditingFrom(false)} />
              ) : (
                <PersonCard
                  label="De"
                  selectedId={fromId}
                  selectedName={from.selectedName}
                  onClick={() => setEditingFrom(true)}
                />
              )}
            </div>

            {/* Arrow icon */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              style={{ flexShrink: 0, color: '#c9a86a' }}
            >
              <path
                d="M5 12h14M13 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            {/* To selector */}
            <div style={{ flex: 1, minWidth: '220px' }}>
              {editingTo ? (
                <SearchDropdown hook={to} onClose={() => setEditingTo(false)} />
              ) : (
                <PersonCard
                  label="À"
                  selectedId={toId}
                  selectedName={to.selectedName}
                  onClick={() => setEditingTo(true)}
                />
              )}
            </div>
          </div>

          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="button"
              variant="primary"
              onClick={handleFind}
              disabled={!fromId || !toId || loading}
            >
              {loading ? 'Recherche…' : 'Trouver le lien'}
            </Button>
          </div>
        </div>

        {/* Same person */}
        {result?.samePerson && (
          <div
            style={{
              background: '#fffdf9',
              border: '1px solid #e7e0d0',
              borderRadius: '14px',
              padding: '20px',
              textAlign: 'center',
              color: '#8a8474',
              fontSize: '14px',
            }}
          >
            C&apos;est la même personne.
          </div>
        )}

        {/* No path found */}
        {result && !result.samePerson && result.path === null && (
          <div
            style={{
              background: '#fffdf9',
              border: '1px solid #e7e0d0',
              borderRadius: '14px',
              padding: '20px',
              textAlign: 'center',
              color: '#8a8474',
              fontSize: '14px',
            }}
          >
            Aucun lien généalogique trouvé entre ces deux personnes.
          </div>
        )}

        {/* Result banner */}
        {result?.path && result.path.length > 0 && (
          <div
            style={{
              background: '#1e3a2f',
              color: '#f4efe3',
              borderRadius: '14px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              style={{ color: '#c9a86a', flexShrink: 0 }}
            >
              <path
                d="M5 8l5 5 5-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span style={{ fontSize: '14.5px' }}>
              <span style={{ fontWeight: 700 }}>{result.path[result.path.length - 1]?.name}</span>
              {result.relationship ? (
                <> est {result.relationship === 'conjoint(e)' ? 'le/la ' : 'le/la '}
                  <span style={{ fontWeight: 700 }}>{result.relationship}</span> de
                </>
              ) : (
                <> est relié(e) à</>
              )}
              {' '}
              <span style={{ fontWeight: 700 }}>{result.path[0]?.name}</span>
              {result.degree !== null && (
                <span style={{ color: '#c9a86a', marginLeft: '8px' }}>
                  · {result.degree} lien{result.degree > 1 ? 's' : ''}
                </span>
              )}
            </span>
          </div>
        )}

        {/* Path list */}
        {result?.path && result.path.length > 0 && (
          <div>
            {result.path.map((node) => (
              <div key={node.id}>
                <Link
                  href={`/person/${node.id}`}
                  className="block"
                  style={{
                    background: '#fffdf9',
                    border: '1px solid #e7e0d0',
                    borderRadius: '13px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    textDecoration: 'none',
                    transition: 'border-color .15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#c9a86a')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '#e7e0d0')}
                >
                  <Avatar person={node} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#1c1f1c' }}>
                      {node.name}
                    </div>
                    {node.birthYear && (
                      <div style={{ fontSize: '12px', color: '#8a8474', marginTop: '2px' }}>
                        {node.sex === 'F' ? 'née en' : 'né en'} {node.birthYear}
                      </div>
                    )}
                  </div>
                </Link>

                {/* Connector to next */}
                {node.relToNext && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      paddingLeft: '20px',
                      margin: '4px 0',
                    }}
                  >
                    <div
                      style={{
                        width: '2px',
                        height: '28px',
                        background: '#d8cfb8',
                        marginRight: '16px',
                      }}
                    />
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#6b5e48',
                        background: '#f1ece0',
                        border: '1px solid #e3dcca',
                        borderRadius: '999px',
                        padding: '3px 10px',
                      }}
                    >
                      {node.relToNext}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
