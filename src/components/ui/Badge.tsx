import React from 'react';

export type BadgeTone = 'ok' | 'today' | 'warn' | 'neutral' | 'danger';

const TONES: Record<BadgeTone, React.CSSProperties> = {
  ok:      { background: 'var(--ok-bg)',      color: 'var(--ok-fg)' },
  today:   { background: 'var(--today-bg)',   color: 'var(--today-fg)' },
  warn:    { background: 'var(--warn-bg)',     color: 'var(--warn-fg)' },
  neutral: { background: 'var(--neutral-bg)', color: 'var(--neutral-fg)' },
  danger:  { background: 'var(--danger-bg)',  color: 'var(--danger-fg)' },
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ tone = 'ok', children, style, ...rest }: BadgeProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontFamily: 'var(--font-sans)',
        fontSize: 12,
        fontWeight: 'var(--w-semibold)' as any,
        borderRadius: 'var(--r-pill)',
        padding: '3px 10px',
        whiteSpace: 'nowrap',
        ...TONES[tone],
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  );
}
