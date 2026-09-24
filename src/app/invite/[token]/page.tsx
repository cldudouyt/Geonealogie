'use client';

import { useState, useTransition, Suspense, use } from 'react';
import { activateInvitation } from './actions';

const cardStyle: React.CSSProperties = {
  position: 'relative', width: '100%', maxWidth: 420,
  background: '#fffdf9', borderRadius: 22,
  padding: '38px 34px', boxShadow: '0 30px 80px -30px rgba(0,0,0,.6)',
};
const inputStyle: React.CSSProperties = {
  width: '100%', height: 44, borderRadius: 11,
  border: '1.5px solid #e0d8c6', background: '#fffdf9',
  padding: '0 14px', fontSize: 15, color: '#1c1f1c',
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color .15s, box-shadow .15s', fontFamily: 'inherit',
};
const btnStyle: React.CSSProperties = {
  width: '100%', height: 46, borderRadius: 10,
  background: '#1e3a2f', color: '#f1ede2',
  fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer',
  fontFamily: 'inherit',
};

function focus(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = '#2f5142';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(47,81,66,.12)';
}
function blur(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = '#e0d8c6';
  e.currentTarget.style.boxShadow = 'none';
}

function InviteSetup({ token }: { token: string }) {
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('token', token);
    setError('');
    startTransition(async () => {
      const result = await activateInvitation(fd);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'linear-gradient(155deg, #1e3a2f 0%, #15271f 60%, #0f1d16 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}>
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 600px 500px at 80% -10%, rgba(201,168,106,.45) 0%, transparent 70%)',
        opacity: 0.6, pointerEvents: 'none',
      }} />
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 52, height: 52, borderRadius: 15,
            background: 'linear-gradient(145deg, #2f5142 0%, #1e3a2f 100%)', marginBottom: 14,
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#c9a86a" strokeWidth="1.8" strokeLinecap="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <h1 style={{
            fontFamily: 'var(--font-serif, Newsreader, Georgia, serif)',
            fontSize: 24, fontWeight: 500, color: '#1c1f1c',
            letterSpacing: '-0.02em', margin: '0 0 6px',
          }}>
            Bienvenue sur Géonéalogie
          </h1>
          <p style={{ fontSize: 13, color: '#8a8474', margin: 0 }}>
            Choisissez un prénom et un mot de passe pour activer votre compte.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label htmlFor="name" style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#3a4038', marginBottom: 6 }}>
              Votre prénom
            </label>
            <input
              id="name" name="name" type="text" required autoFocus
              placeholder="Marie"
              style={inputStyle} onFocus={focus} onBlur={blur}
            />
          </div>
          <div>
            <label htmlFor="password" style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#3a4038', marginBottom: 6 }}>
              Mot de passe
            </label>
            <input
              id="password" name="password" type="password" required
              autoComplete="new-password" placeholder="8 caractères minimum"
              style={inputStyle} onFocus={focus} onBlur={blur}
            />
          </div>
          <div>
            <label htmlFor="confirm" style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#3a4038', marginBottom: 6 }}>
              Confirmer le mot de passe
            </label>
            <input
              id="confirm" name="confirm" type="password" required
              autoComplete="new-password" placeholder="••••••••"
              style={inputStyle} onFocus={focus} onBlur={blur}
            />
          </div>

          {error && (
            <p style={{
              margin: 0, fontSize: 13.5, color: '#b03a2e',
              background: '#fae6e3', border: '1px solid #f5c5bf',
              borderRadius: 10, padding: '10px 14px',
            }}>{error}</p>
          )}

          <button type="submit" disabled={isPending} style={{ ...btnStyle, opacity: isPending ? 0.65 : 1 }}>
            {isPending ? 'Activation…' : 'Activer mon compte'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  return (
    <Suspense fallback={null}>
      <InviteSetup token={token} />
    </Suspense>
  );
}
