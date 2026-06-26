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

const AVATAR_COLORS = [
  '#2f5142', '#3f617f', '#8a6d12', '#9c5a52', '#4a7058',
  '#6b5740', '#5a7a6a', '#7a5a40', '#4a6a8a', '#6a4a5a',
];

function getAvatarColor(surname: string): string {
  let hash = 0;
  for (let i = 0; i < surname.length; i++) {
    hash = surname.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function SurnameGrid({ groups, initialLimit = 40 }: SurnameGridProps) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? groups : groups.slice(0, initialLimit);
  const hidden = groups.length - initialLimit;

  return (
    <div>
      <div className="flex flex-col gap-2">
        {displayed.map((g) => (
          <a
            key={g.surname}
            href={`/tree?focus=${g.focusId}`}
            className="group flex items-center gap-3 px-4 py-3 rounded-[13px] border transition-all"
            style={{ background: '#fffdf9', borderColor: '#e9e2d2' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#c9a86a'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#e9e2d2'; }}
          >
            <div
              className="w-10 h-10 rounded-[10px] flex items-center justify-center text-white font-semibold text-sm shrink-0"
              style={{ background: getAvatarColor(g.surname) }}
            >
              {g.surname.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="font-semibold text-[14.5px] truncate"
                style={{ color: '#1c1f1c', fontFamily: 'var(--font-sans)' }}
              >
                {g.surname}
              </p>
              {g.sampleNames.length > 0 && (
                <p className="text-[12px] truncate mt-0.5" style={{ color: '#8a8474', fontFamily: 'var(--font-sans)' }}>
                  {g.sampleNames.join(', ')}
                </p>
              )}
            </div>
            <span
              className="text-[12px] font-semibold px-2.5 py-1 rounded-full shrink-0"
              style={{ background: '#eef2ec', color: '#2f5142' }}
            >
              {g.count}
            </span>
          </a>
        ))}
      </div>

      {groups.length > initialLimit && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowAll(v => !v)}
            className="text-[13px] font-medium inline-flex items-center gap-1 transition-colors"
            style={{ color: '#2f5142', fontFamily: 'var(--font-sans)' }}
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
