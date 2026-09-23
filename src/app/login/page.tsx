'use client';

import { useActionState, useEffect, useSyncExternalStore, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { login } from './actions';

const subscribe = () => () => {};

function WelcomeBanner() {
  const isWelcome = useSearchParams().get('welcome') === '1';
  if (!isWelcome) return null;
  return (
    <div style={{
      background: '#eef5f0', border: '1px solid #c3deca', borderRadius: 12,
      padding: '14px 16px', marginBottom: 4, fontSize: 13.5, color: '#2a4f37', lineHeight: 1.55,
    }}>
      ✓ Compte activé ! Cliquez sur <strong>Mot de passe oublié</strong> ci-dessous pour définir votre mot de passe.
    </div>
  );
}

export default function LoginPage() {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const [state, action, pending] = useActionState(login, null);
  useEffect(() => { if (state?.success) window.location.assign('/'); }, [state?.success]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'linear-gradient(155deg, #1e3a2f 0%, #15271f 60%, #0f1d16 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Décoration dorée en haut à droite */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 600px 500px at 80% -10%, rgba(201,168,106,.45) 0%, transparent 70%)',
          opacity: 0.6,
          pointerEvents: 'none',
        }}
      />

      {/* Card centrale */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 380,
          background: '#fffdf9',
          borderRadius: 22,
          padding: '38px 34px',
          boxShadow: '0 30px 80px -30px rgba(0,0,0,.6)',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 52,
              height: 52,
              borderRadius: 15,
              background: 'linear-gradient(145deg, #2f5142 0%, #1e3a2f 100%)',
              marginBottom: 14,
            }}
          >
            <svg
              width="30"
              height="30"
              viewBox="0 0 30 30"
              fill="none"
              stroke="#c9a86a"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="15" cy="8" r="3" />
              <circle cx="7" cy="21" r="3" />
              <circle cx="23" cy="21" r="3" />
              <line x1="15" y1="11" x2="11" y2="18" />
              <line x1="15" y1="11" x2="19" y2="18" />
              <line x1="11" y1="18" x2="7" y2="18" />
              <line x1="19" y1="18" x2="23" y2="18" />
            </svg>
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-serif, Newsreader, Georgia, serif)',
              fontSize: 26,
              fontWeight: 500,
              color: '#1c1f1c',
              letterSpacing: '-0.02em',
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            Géonéalogie
          </h1>

          <p
            style={{
              fontSize: 13,
              color: '#8a8474',
              margin: '6px 0 0',
            }}
          >
            Accès privé — famille uniquement
          </p>
        </div>

        {/* Bandeau de bienvenue après acceptation d'invitation */}
        <Suspense>
          <WelcomeBanner />
        </Suspense>

        {/* Formulaire */}
        <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label
              htmlFor="email"
              style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#3a4038', marginBottom: 6 }}
            >
              Votre email
            </label>
            <input
              id="email"
              type="email"
              name="email"
              required
              autoFocus
              autoComplete="email"
              placeholder="marie@exemple.fr"
              style={{
                width: '100%', height: 44, borderRadius: 11,
                border: '1.5px solid #e0d8c6', background: '#fffdf9',
                padding: '0 14px', fontSize: 15, color: '#1c1f1c',
                outline: 'none', boxSizing: 'border-box',
                transition: 'border-color .15s, box-shadow .15s',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#2f5142';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(47,81,66,.12)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#e0d8c6';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>
          <div>
            <label
              htmlFor="password"
              style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#3a4038', marginBottom: 6 }}
            >
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              name="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              style={{
                width: '100%', height: 44, borderRadius: 11,
                border: '1.5px solid #e0d8c6', background: '#fffdf9',
                padding: '0 14px', fontSize: 15, color: '#1c1f1c',
                outline: 'none', boxSizing: 'border-box',
                transition: 'border-color .15s, box-shadow .15s',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#2f5142';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(47,81,66,.12)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#e0d8c6';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {state?.error && (
            <p style={{ fontSize: 13, color: '#b91c1c', margin: 0 }}>{state.error}</p>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <a href="/reset" style={{ fontSize: 12.5, color: '#2f5142', textDecoration: 'none' }}>
              Mot de passe oublié ?
            </a>
          </div>

          <button
            type="submit"
            disabled={pending || !hydrated}
            style={{
              width: '100%',
              height: 46,
              borderRadius: 10,
              background: '#1e3a2f',
              color: '#f1ede2',
              fontSize: 15,
              fontWeight: 600,
              border: 'none',
              cursor: pending ? 'not-allowed' : 'pointer',
              opacity: pending ? 0.65 : 1,
              transition: 'background .15s',
            }}
            onMouseEnter={(e) => {
              if (!pending) e.currentTarget.style.background = '#15271f';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#1e3a2f';
            }}
          >
            {pending ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
