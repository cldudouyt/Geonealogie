'use client';

import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'md' | 'sm';

const VARIANTS: Record<ButtonVariant, React.CSSProperties> = {
  primary:   { background: 'var(--green-700)', color: '#f1ede2', border: '1px solid transparent' },
  secondary: { background: 'var(--paper-card)', color: '#3a4038', border: '1px solid var(--line-strong)' },
  danger:    { background: 'var(--danger-bg)', color: 'var(--danger-fg)', border: '1px solid var(--danger-line)' },
  ghost:     { background: 'transparent', color: '#3a4038', border: '1px solid transparent' },
};

const SIZES: Record<ButtonSize, { height: number; padding: string; fontSize: number }> = {
  md: { height: 38, padding: '0 18px', fontSize: 13 },
  sm: { height: 32, padding: '0 13px', fontSize: 12.5 },
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
}

export function Button({ variant = 'primary', size = 'md', icon, disabled, children, style, ...rest }: ButtonProps) {
  const v = VARIANTS[variant];
  const s = SIZES[size];
  return (
    <button
      disabled={disabled}
      style={{
        height: s.height,
        padding: s.padding,
        borderRadius: 'var(--r-md)',
        fontSize: s.fontSize,
        fontWeight: 'var(--w-semibold)' as any,
        fontFamily: 'var(--font-sans)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        transition: 'opacity 0.15s',
        ...v,
        ...style,
      }}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
