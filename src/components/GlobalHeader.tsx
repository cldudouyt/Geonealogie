'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

export default function GlobalHeader() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
  };

  return (
    <header style={{
      height: 66, flexShrink: 0,
      borderBottom: '1px solid #e4ddcd',
      background: 'rgba(244,241,234,.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', gap: 18, padding: '0 30px',
    }}>
      {/* Search bar */}
      <form onSubmit={handleSubmit} style={{ flex: 1, maxWidth: 460, position: 'relative' }}>
        <svg
          style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9a9384" strokeWidth="2" strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
        </svg>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
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
      {/* Actions */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link href="/feedback" style={{
          height: 38, padding: '0 15px', borderRadius: 10, border: '1px solid #e0d8c6',
          background: '#fffdf9', color: '#3a4038', fontSize: 13, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 7, textDecoration: 'none',
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9M3 20l1-4 11-11a2.1 2.1 0 0 1 3 3L7 19z"/>
          </svg>
          Suggérer
        </Link>
        <a href="/api/export?format=gedcom" style={{
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
