'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface SearchResult {
  id: string;
  displayName: string;
  sex: string;
  birthYear?: string;
  deathYear?: string;
  birthPlace?: string;
}

interface SearchBarProps {
  onSelect: (personId: string) => void;
  placeholder?: string;
}

export default function SearchBar({ onSelect, placeholder = 'Rechercher une personne...' }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/persons?autocomplete=true&q=${encodeURIComponent(q)}&limit=10`);
      const data = await res.json();
      setResults(data.persons || []);
      setIsOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = useCallback((value: string) => {
    setQuery(value);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => search(value), 300);
  }, [search]);

  const handleSelect = useCallback((id: string) => {
    setIsOpen(false);
    setQuery('');
    onSelect(id);
  }, [onSelect]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-primary focus:bg-white dark:focus:bg-slate-900 rounded-lg outline-none transition-all"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-slate-300 border-t-primary rounded-full animate-spin" />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden z-50 max-h-80 overflow-y-auto">
          {results.map((person) => {
            const dot = person.sex === 'M' ? 'bg-male' : person.sex === 'F' ? 'bg-female' : 'bg-neutral';
            return (
              <button
                key={person.id}
                onClick={() => handleSelect(person.id)}
                className="flex items-center gap-3 w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0"
              >
                <span className={`w-2.5 h-2.5 rounded-full ${dot} shrink-0`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{person.displayName}</p>
                  <p className="text-xs text-slate-400">
                    {person.birthYear && person.birthYear}
                    {person.deathYear && ` - ${person.deathYear}`}
                    {person.birthPlace && ` | ${person.birthPlace}`}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
