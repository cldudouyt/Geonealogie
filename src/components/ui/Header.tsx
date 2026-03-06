'use client';

import { useState, useCallback } from 'react';
import SearchBar from '../search/SearchBar';

interface HeaderProps {
  onPersonSelect: (personId: string) => void;
}

export default function Header({ onPersonSelect }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 h-14 flex items-center px-4 gap-4">
      <div className="flex items-center gap-2 shrink-0">
        <svg className="w-7 h-7 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3v18M12 3c-3 0-6 3-6 6s3 3 6 3M12 3c3 0 6 3 6 6s-3 3-6 3M12 12c-3 0-6 3-6 6M12 12c3 0 6 3 6 6" />
        </svg>
        <h1 className="text-lg font-bold text-primary hidden sm:block">Geonealogie</h1>
      </div>

      <div className="flex-1 max-w-md">
        <SearchBar onSelect={onPersonSelect} />
      </div>

      <nav className="flex items-center gap-2 shrink-0">
        <a
          href="/search"
          className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
        >
          Recherche
        </a>
      </nav>
    </header>
  );
}
