'use client';

import React from 'react';
import { Avatar, type AvatarTint } from './Avatar';
import { Badge, type BadgeTone } from './Badge';

interface PersonListItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  name: string;
  meta?: string;
  initials?: string;
  tint?: AvatarTint;
  badge?: string;
  badgeTone?: BadgeTone;
}

export function PersonListItem({ name, meta, initials, tint = 'slate', badge, badgeTone = 'ok', style, ...rest }: PersonListItemProps) {
  return (
    <button
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        width: '100%',
        textAlign: 'left',
        cursor: 'pointer',
        background: 'var(--paper-card)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-list)',
        padding: '15px 18px',
        fontFamily: 'var(--font-sans)',
        ...style,
      }}
      {...rest}
    >
      <Avatar name={name} initials={initials} tint={tint} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--ink-900)' }}>
          {name}
        </span>
        {meta && (
          <span style={{ display: 'block', fontSize: 12.5, color: 'var(--ink-500)', marginTop: 2 }}>
            {meta}
          </span>
        )}
      </span>
      {badge && <Badge tone={badgeTone}>{badge}</Badge>}
    </button>
  );
}
