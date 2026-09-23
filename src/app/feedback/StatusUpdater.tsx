'use client';

import { useTransition } from 'react';
import { updateStatus } from './actions';

type StatusKey = 'open' | 'in_progress' | 'resolved';

const STATUSES: { key: StatusKey; label: string }[] = [
  { key: 'open', label: 'Ouvert' },
  { key: 'in_progress', label: 'En cours' },
  { key: 'resolved', label: 'Résolu' },
];

interface StatusUpdaterProps {
  id: string;
  current: StatusKey;
}

export function StatusUpdater({ id, current }: StatusUpdaterProps) {
  const [isPending, startTransition] = useTransition();

  function handleChange(status: StatusKey) {
    if (status === current) return;
    startTransition(async () => {
      await updateStatus(id, status);
    });
  }

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <span style={{ fontSize: 12, color: 'var(--ink-500, #9a9080)', marginRight: 4 }}>
        Statut :
      </span>
      {STATUSES.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          disabled={isPending}
          onClick={() => handleChange(key)}
          style={{
            height: 30,
            padding: '0 12px',
            fontSize: 12,
            fontWeight: key === current ? 700 : 400,
            borderRadius: 999,
            border: key === current ? '2px solid var(--green-600, #2f5142)' : '1px solid var(--line, #e0d8c6)',
            background: key === current ? '#eef2ec' : 'var(--paper-card, #fffdf9)',
            color: key === current ? 'var(--green-700, #1e3a2f)' : 'var(--ink-600, #4a4f46)',
            cursor: key === current || isPending ? 'default' : 'pointer',
            opacity: isPending ? 0.6 : 1,
            fontFamily: 'var(--font-sans)',
            transition: 'background .12s, border-color .12s',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
