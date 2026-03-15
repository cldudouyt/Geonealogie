'use client';

import { useState } from 'react';
import Link from 'next/link';
import SearchBar from '../search/SearchBar';

interface HeaderProps {
  onPersonSelect: (personId: string) => void;
}

const PRIMARY_LINKS = [
  {
    href: '/search', label: 'Recherche',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
      </svg>
    ),
  },
  {
    href: '/map', label: 'Carte',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6-10l6-3m0 16l5.447-2.724A1 1 0 0021 17.382V6.618a1 1 0 00-1.447-.894L15 8m0 9V5" />
      </svg>
    ),
  },
  {
    href: '/stats', label: 'Statistiques',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

const MORE_LINKS = [
  { href: '/timeline', label: 'Frise chronologique' },
  { href: '/relation', label: 'Chemin de parenté' },
  { href: '/network', label: 'Graphe de réseau' },
  { href: '/anniversaires', label: 'Anniversaires' },
  { href: '/anomalies', label: 'Rapport d\'anomalies' },
  { href: '/doublons', label: 'Détection de doublons' },
];

const EXPORT_LINKS = [
  { href: '/api/export/csv', label: 'Export CSV' },
  { href: '/api/export/gedcom', label: 'Export GEDCOM' },
];

export default function Header({ onPersonSelect }: HeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 h-14 flex items-center px-4 gap-4">
      <Link href="/" className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity">
        <svg className="w-7 h-7 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3v18M12 3c-3 0-6 3-6 6s3 3 6 3M12 3c3 0 6 3 6 6s-3 3-6 3M12 12c-3 0-6 3-6 6M12 12c3 0 6 3 6 6" />
        </svg>
        <h1 className="text-lg font-bold text-primary hidden sm:block">Geonealogie</h1>
      </Link>

      <div className="flex-1 max-w-md">
        <SearchBar onSelect={onPersonSelect} />
      </div>

      <nav className="flex items-center gap-1 shrink-0">
        {PRIMARY_LINKS.map(({ href, label, icon }) => (
          <a
            key={href}
            href={href}
            className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap hidden md:flex items-center gap-1.5"
          >
            {icon}
            {label}
          </a>
        ))}

        {/* More dropdown */}
        <div className="relative">
          <button
            onClick={() => setOpen(v => !v)}
            className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors flex items-center gap-1"
          >
            Plus
            <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20 py-1 min-w-48">
                {/* Mobile: show primary links too */}
                <div className="md:hidden">
                  {PRIMARY_LINKS.map(({ href, label, icon }) => (
                    <a key={href} href={href} onClick={() => setOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      {icon}
                      {label}
                    </a>
                  ))}
                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                </div>

                {MORE_LINKS.map(({ href, label }) => (
                  <a key={href} href={href} onClick={() => setOpen(false)}
                    className="block px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    {label}
                  </a>
                ))}

                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                <p className="px-4 py-1 text-xs text-slate-400 font-medium uppercase tracking-wide">Exports</p>
                {EXPORT_LINKS.map(({ href, label }) => (
                  <a key={href} href={href} onClick={() => setOpen(false)}
                    className="block px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    {label}
                  </a>
                ))}
              </div>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
