'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import OriginsMapWrapper from './OriginsMapWrapper';
import type { BirthplaceEntry, FocusedPerson } from './OriginsMap';

interface PersonSuggestion {
  id: string;
  displayName: string;
  birthYear?: string;
  birthPlace?: string;
  birthLat?: number;
  birthLon?: number;
}

export default function OriginsMapSection() {
  const flyToRef = useRef<((lat: number, lng: number) => void) | null>(null);
  const [places, setPlaces] = useState<BirthplaceEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Search state
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PersonSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const [focusedPerson, setFocusedPerson] = useState<FocusedPerson | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/persons/birthplaces')
      .then(r => r.json())
      .then(d => setPlaces(d.places || []))
      .finally(() => setLoading(false));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    if (!value.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      setFocusedPerson(null);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/persons?q=${encodeURIComponent(value)}&autocomplete=true&limit=8`);
        const data = await res.json();
        const persons: PersonSuggestion[] = (data.persons || []).map((p: PersonSuggestion) => ({
          id: p.id,
          displayName: p.displayName,
          birthYear: p.birthYear,
          birthPlace: p.birthPlace,
          birthLat: p.birthLat,
          birthLon: p.birthLon,
        }));
        setSuggestions(persons);
        setShowDropdown(true);
      } finally {
        setSearching(false);
      }
    }, 280);
  }, []);

  function selectPerson(person: PersonSuggestion) {
    setQuery(person.displayName);
    setShowDropdown(false);
    if (person.birthLat != null && person.birthLon != null) {
      flyToRef.current?.(person.birthLat, person.birthLon);
      setFocusedPerson({
        name: person.displayName,
        lat: person.birthLat,
        lng: person.birthLon,
        birthPlace: person.birthPlace,
      });
    }
  }

  function clearSearch() {
    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    setFocusedPerson(null);
  }

  return (
    <div>
      {/* Search bar */}
      <div ref={containerRef} style={{ position: 'relative', marginBottom: 20 }}>
        <div style={{ position: 'relative' }}>
          {/* Loupe */}
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{
            position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
            color: '#9a9080', pointerEvents: 'none',
          }}>
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.4"/>
            <line x1="10.5" y1="10.5" x2="13.5" y2="13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Rechercher une personne…"
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
            style={{
              width: '100%',
              height: 40,
              borderRadius: 11,
              border: '1px solid #e0d8c6',
              padding: '0 36px 0 36px',
              fontSize: 13.5,
              fontFamily: 'inherit',
              background: 'var(--paper-card, #fffdf9)',
              color: 'var(--ink-900, #1c1f1c)',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color .15s, box-shadow .15s',
            }}
            onFocusCapture={e => {
              e.currentTarget.style.borderColor = '#2f5142';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(47,81,66,.12)';
            }}
            onBlurCapture={e => {
              e.currentTarget.style.borderColor = '#e0d8c6';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          {/* Clear / spinner */}
          {searching ? (
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#9a9080' }}>
              …
            </span>
          ) : query ? (
            <button
              type="button"
              onClick={clearSearch}
              style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', padding: 3,
                color: '#9a9080', lineHeight: 1, fontSize: 15,
              }}
              aria-label="Effacer"
            >
              ✕
            </button>
          ) : null}
        </div>

        {/* Dropdown */}
        {showDropdown && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: '#fffdf9',
            border: '1px solid #e0d8c6',
            borderRadius: 12,
            boxShadow: '0 8px 24px -8px rgba(0,0,0,.18)',
            zIndex: 100,
            overflow: 'hidden',
          }}>
            {suggestions.length === 0 ? (
              <div style={{ padding: '12px 14px', fontSize: 13, color: '#9a9080' }}>
                Aucun résultat
              </div>
            ) : suggestions.map(person => (
              <button
                key={person.id}
                type="button"
                onMouseDown={() => selectPerson(person)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '10px 14px',
                  background: 'none',
                  border: 'none',
                  borderBottom: '1px solid #f0ece4',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f7f3ea')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1c1f1c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {person.displayName}
                  </div>
                  <div style={{ fontSize: 11.5, color: '#8a8474', marginTop: 1 }}>
                    {person.birthYear && <span>{person.birthYear}</span>}
                    {person.birthYear && person.birthPlace && <span> · </span>}
                    {person.birthPlace && <span>{person.birthPlace}</span>}
                  </div>
                </div>
                {person.birthLat == null && (
                  <span style={{ fontSize: 11, color: '#c9a86a', flexShrink: 0 }}>non géolocalisé</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map + sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
        {/* Map */}
        <div style={{
          position: 'relative',
          height: 560,
          borderRadius: 20,
          overflow: 'hidden',
          border: '1px solid #d9e0d4',
        }}>
          {loading ? (
            <div style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#e4ede8',
              color: '#8a8474',
              fontSize: 14,
            }}>
              Chargement de la carte…
            </div>
          ) : (
            <OriginsMapWrapper places={places} flyToRef={flyToRef} focusedPerson={focusedPerson} />
          )}
        </div>

        {/* Principaux foyers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h3 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 18,
            fontWeight: 600,
            margin: '0 0 4px',
            color: 'var(--ink-900)',
          }}>
            Principaux foyers
          </h3>
          {loading && (
            [0, 1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{
                height: 56,
                borderRadius: 14,
                background: '#e9e4d8',
                animation: 'geo-fade .6s ease both',
                animationDelay: `${i * 80}ms`,
              }} />
            ))
          )}
          {places.map(pl => (
            <button
              key={pl.place}
              type="button"
              onClick={() => {
                flyToRef.current?.(pl.lat, pl.lng);
                setFocusedPerson(null);
                setQuery('');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 13,
                background: 'var(--paper-card)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--r-list)',
                padding: '13px 15px',
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'border-color .15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#c9a86a')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--line)')}
            >
              <div style={{
                width: 10,
                height: 10,
                flexShrink: 0,
                borderRadius: '50%',
                background: pl.color,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {pl.place}
                </div>
                {pl.region && (
                  <div style={{ fontSize: 11.5, color: 'var(--ink-500)', marginTop: 1 }}>
                    {pl.region}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--green-600)', flexShrink: 0 }}>
                {pl.count}
              </div>
            </button>
          ))}
          {!loading && places.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--ink-500)', padding: '20px 0' }}>
              Aucun lieu géolocalisé pour l'instant.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
