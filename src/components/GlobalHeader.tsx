'use client';
import { useSession } from './SessionContext';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface SearchResult {
  id: string;
  displayName: string;
  sex: string;
  birthYear?: string;
  deathYear?: string;
  birthPlace?: string;
}

export default function GlobalHeader() {
  const { canEdit } = useSession();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    try {
      const res = await fetch(`/api/persons?autocomplete=true&q=${encodeURIComponent(q)}&limit=8`);
      const data = await res.json();
      const persons: SearchResult[] = data.persons || [];
      setResults(persons);
      setOpen(persons.length > 0);
      setActiveIndex(-1);
    } catch {
      setResults([]);
    }
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 250);
  };

  const goToPerson = (id: string) => {
    setOpen(false);
    setQuery('');
    setResults([]);
    router.push(`/person/${id}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeIndex >= 0 && results[activeIndex]) {
      goToPerson(results[activeIndex].id);
      return;
    }
    const q = query.trim();
    setOpen(false);
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => (i <= 0 ? -1 : i - 1));
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="global-header" style={{
      height: 66, flexShrink: 0,
      borderBottom: '1px solid #e4ddcd',
      background: 'rgba(244,241,234,.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', gap: 18, padding: '0 30px',
      position: 'relative', zIndex: 100,
    }}>
      {/* Search bar */}
      <div ref={containerRef} style={{ flex: 1, maxWidth: 460, position: 'relative' }}>
        <form onSubmit={handleSubmit}>
          <svg
            style={{ position: 'absolute', left: 14, top: 20, transform: 'translateY(-50%)', pointerEvents: 'none' }}
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9a9384" strokeWidth="2" strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
          </svg>
          <input
            value={query}
            onChange={e => handleChange(e.target.value)}
            onFocus={() => { setFocused(true); if (results.length > 0) setOpen(true); }}
            onBlur={() => setFocused(false)}
            onKeyDown={handleKeyDown}
            aria-label="Rechercher une personne"
            role="combobox"
            aria-controls="global-search-results"
            aria-activedescendant={activeIndex >= 0 ? `search-option-${activeIndex}` : undefined}
            aria-expanded={open}
            aria-autocomplete="list"
            placeholder="Rechercher une personne, un lieu, une date…"
            style={{
              width: '100%', height: 40, border: `1px solid ${focused ? '#2f5142' : '#e0d8c6'}`,
              background: '#fffdf9', borderRadius: 11, padding: '0 14px 0 40px',
              fontFamily: 'inherit', fontSize: 13.5, color: '#1c1f1c', outline: 'none',
              cursor: 'text', boxSizing: 'border-box',
              boxShadow: focused ? '0 0 0 3px rgba(47,81,66,.12)' : 'none',
              transition: 'border-color .15s, box-shadow .15s',
            }}
          />
        </form>

        {/* Autocomplete dropdown */}
        {open && results.length > 0 && (
          <div id="global-search-results" role="listbox" style={{
            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6,
            background: '#fffdf9', border: '1px solid #e7e0d0', borderRadius: 14,
            boxShadow: '0 8px 24px rgba(0,0,0,.1)', overflow: 'hidden', zIndex: 200,
          }}>
            {results.map((p, idx) => {
              const dotColor = p.sex === 'M' ? '#5b7da3' : p.sex === 'F' ? '#b5736b' : '#9aa89b';
              const years = [p.birthYear, p.deathYear].filter(Boolean).join(' – ');
              const meta = [years, p.birthPlace].filter(Boolean).join(' · ');
              return (
                <button
                  key={p.id}
                  role="option"
                  id={`search-option-${idx}`}
                  aria-selected={idx === activeIndex}
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => goToPerson(p.id)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    textAlign: 'left', padding: '9px 14px', border: 'none', cursor: 'pointer',
                    background: idx === activeIndex ? '#f1f4ef' : 'transparent',
                    borderBottom: idx < results.length - 1 ? '1px solid #f1ebdd' : 'none',
                    fontFamily: 'inherit',
                  }}
                >
                  <span style={{
                    width: 8, height: 8, borderRadius: 999, background: dotColor, flexShrink: 0,
                  }} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{
                      display: 'block', fontSize: 13.5, fontWeight: 600, color: '#1c1f1c',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {p.displayName}
                    </span>
                    {meta && (
                      <span style={{
                        display: 'block', fontSize: 11.5, color: '#6c7064',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {meta}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => {
                setOpen(false);
                router.push(`/search?q=${encodeURIComponent(query.trim())}`);
              }}
              style={{
                display: 'block', width: '100%', textAlign: 'center', padding: '9px 14px',
                border: 'none', borderTop: '1px solid #e7e0d0', cursor: 'pointer',
                background: '#f1f4ef', fontSize: 12.5, fontWeight: 600, color: '#2f5142',
                fontFamily: 'inherit',
              }}
            >
              Voir tous les résultats pour « {query.trim()} »
            </button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="header-actions" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
        {canEdit && <Link href="/feedback/new" style={{
          height: 38, padding: '0 15px', borderRadius: 10, border: '1px solid #e0d8c6',
          background: '#fffdf9', color: '#3a4038', fontSize: 13, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 7, textDecoration: 'none',
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9M3 20l1-4 11-11a2.1 2.1 0 0 1 3 3L7 19z"/>
          </svg>
          Suggérer
        </Link>}
        <a href="/api/export/gedcom" style={{
          height: 38, padding: '0 15px', borderRadius: 10, border: '1px solid transparent',
          background: '#1e3a2f', color: '#f1ede2', fontSize: 13, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 7, textDecoration: 'none',
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M5 21h14"/>
          </svg>
          Exporter
        </a>
      </div>
    </header>
  );
}
