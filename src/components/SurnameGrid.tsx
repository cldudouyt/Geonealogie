'use client';

import { useState } from 'react';

interface SurnameGroup {
  surname: string;
  count: number;
  focusId: string;
  sampleNames: string[];
}

interface SurnameGridProps {
  groups: SurnameGroup[];
  initialLimit?: number;
}

export default function SurnameGrid({ groups, initialLimit = 40 }: SurnameGridProps) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? groups : groups.slice(0, initialLimit);
  const hidden = groups.length - initialLimit;

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {displayed.map((g) => (
          <a
            key={g.surname}
            href={`/?focus=${g.focusId}`}
            className="group dark:bg-slate-900 dark:border-slate-700 rounded-xl p-4 hover:border-primary hover:shadow-md transition-all"
            style={{ background: '#fffaf5', border: '1px solid #e8dcc8' }}
          >
            <p className="font-semibold dark:text-slate-100 group-hover:text-primary transition-colors truncate" style={{ color: '#3d2e1e' }}>
              {g.surname}
            </p>
            <p className="text-2xl font-bold text-primary mt-1">{g.count}</p>
            <p className="text-xs mt-1 truncate" style={{ color: '#a89070' }}>
              {g.sampleNames.join(', ')}
              {g.sampleNames.length > 0 && '…'}
            </p>
          </a>
        ))}
      </div>

      {groups.length > initialLimit && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowAll(v => !v)}
            className="text-sm text-primary hover:text-primary-light transition-colors inline-flex items-center gap-1"
          >
            {showAll ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                Réduire
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                Voir les {hidden} autres noms
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
