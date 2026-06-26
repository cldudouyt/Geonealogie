'use client';

import React, { useState } from 'react';

const SearchIcon = ({ focused }: { focused: boolean }) => (
  <svg
    width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke={focused ? 'var(--green-600)' : '#9a9384'}
    strokeWidth="2" strokeLinecap="round"
    style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
  >
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  search?: boolean;
  wrapStyle?: React.CSSProperties;
}

export function Input({ label, search = false, style, wrapStyle, onFocus, onBlur, ...rest }: InputProps) {
  const [focused, setFocused] = useState(false);

  const field = (
    <div style={{ position: 'relative', ...wrapStyle }}>
      {search && <SearchIcon focused={focused} />}
      <input
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        style={{
          width: '100%',
          height: 40,
          border: `1px solid ${focused ? 'var(--green-600)' : 'var(--line-strong)'}`,
          background: 'var(--paper-card)',
          borderRadius: 'var(--r-lg)',
          padding: search ? '0 14px 0 40px' : '0 14px',
          fontFamily: 'var(--font-sans)',
          fontSize: 13.5,
          color: 'var(--ink-900)',
          outline: 'none',
          boxShadow: focused ? '0 0 0 3px var(--focus-ring)' : 'none',
          ...style,
        }}
        {...rest}
      />
    </div>
  );

  if (!label) return field;
  return (
    <label style={{ display: 'block', fontFamily: 'var(--font-sans)' }}>
      <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-600)', marginBottom: 5 }}>
        {label}
      </span>
      {field}
    </label>
  );
}
