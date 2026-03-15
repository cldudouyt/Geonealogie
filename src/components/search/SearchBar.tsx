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
  const [activeIndex, setActiveIndex] = useState(-1);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/persons?autocomplete=true&q=${encodeURIComponent(q)}&limit=20`);
      const data = await res.json();
      setResults(data.persons || []);
      setIsOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Reset active index when results change
  useEffect(() => { setActiveIndex(-1); }, [results]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll('[role="option"]');
    items[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const handleChange = useCallback((value: string) => {
    setQuery(value);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => search(value), 300);
  }, [search]);

  const handleSelect = useCallback((id: string) => {
    setIsOpen(false);
    setActiveIndex(-1);
    setQuery('');
    onSelect(id);
  }, [onSelect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) {
      if (e.key === 'Escape') setQuery('');
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(i => Math.min(i + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(i => (i <= 0 ? -1 : i - 1));
        break;
      case 'Enter':
        if (activeIndex >= 0) {
          e.preventDefault();
          handleSelect(results[activeIndex].id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
        inputRef.current?.blur();
        break;
      case 'Tab':
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  }, [isOpen, results, activeIndex, handleSelect]);

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

  const listboxId = 'search-listbox';

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label="Rechercher une personne"
          aria-autocomplete="list"
          aria-expanded={isOpen && results.length > 0}
          aria-controls={listboxId}
          aria-activedescendant={activeIndex >= 0 ? `search-option-${activeIndex}` : undefined}
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-primary focus:bg-white dark:focus:bg-slate-900 rounded-lg outline-none transition-all"
        />
        {loading && (
          <div aria-hidden className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-slate-300 border-t-primary rounded-full animate-spin" />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label="Résultats de recherche"
          className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-y-auto z-[9999] max-h-80"
        >
          {results.map((person, idx) => {
            const dot = person.sex === 'M' ? 'bg-male' : person.sex === 'F' ? 'bg-female' : 'bg-neutral';
            const isActive = idx === activeIndex;
            return (
              <button
                key={person.id}
                id={`search-option-${idx}`}
                role="option"
                aria-selected={isActive}
                onClick={() => handleSelect(person.id)}
                className={`flex items-center gap-3 w-full text-left px-4 py-2.5 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0 ${
                  isActive
                    ? 'bg-primary/10 dark:bg-primary/20'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span aria-hidden className={`w-2.5 h-2.5 rounded-full ${dot} shrink-0`} />
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
