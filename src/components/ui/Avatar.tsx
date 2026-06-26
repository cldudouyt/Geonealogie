import React from 'react';

export type AvatarSize = 'sm' | 'md' | 'lg';
export type AvatarTint = 'slate' | 'green' | 'gold';

const SIZES: Record<AvatarSize, { box: number; font: number }> = {
  sm: { box: 32, font: 12 },
  md: { box: 46, font: 17 },
  lg: { box: 82, font: 28 },
};

const TINTS: Record<AvatarTint, React.CSSProperties> = {
  slate: { background: 'var(--slate-100)', color: 'var(--slate-700)' },
  green: { background: 'var(--ok-bg)',     color: 'var(--green-600)' },
  gold:  { background: 'var(--green-600)', color: 'var(--gold-500)' },
};

function initialsOf(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name?: string;
  initials?: string;
  size?: AvatarSize;
  tint?: AvatarTint;
}

export function Avatar({ name, initials, size = 'md', tint = 'slate', style, ...rest }: AvatarProps) {
  const s = SIZES[size];
  const t = TINTS[tint];
  const label = initials ?? initialsOf(name);
  return (
    <div
      style={{
        width: s.box,
        height: s.box,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontFamily: 'var(--font-serif)',
        fontWeight: 600,
        fontSize: s.font,
        ...t,
        ...style,
      }}
      {...rest}
    >
      {label}
    </div>
  );
}
