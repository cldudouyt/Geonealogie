'use client';

import { useActionState } from 'react';
import { requestReset, type ResetRequestState } from './actions';

const inputStyle: React.CSSProperties = {
  width: '100%', height: 44, borderRadius: 11,
  border: '1.5px solid #e0d8c6', background: '#fffdf9',
  padding: '0 14px', fontSize: 15, color: '#1c1f1c',
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color .15s, box-shadow .15s',
};
const focus = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.borderColor = '#2f5142';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(47,81,66,.12)';
};
const blur = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.borderColor = '#e0d8c6';
  e.currentTarget.style.boxShadow = 'none';
};

export default function ResetPage() {
  const [state, action, pending] = useActionState<ResetRequestState, FormData>(requestReset, null);

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
      <div style={{
        position: 'relative', width: '100%', maxWidth: 380,
        background: '#fffdf9', borderRadius: 22,
        padding: '38px 34px', boxShadow: '0 30px 80px -30px rgba(0,0,0,.6)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 52, height: 52, borderRadius: 15,
            background: 'linear-gradient(145deg, #2f5142 0%, #1e3a2f 100%)', marginBottom: 14,
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#c9a86a" strokeWidth="1.8" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h1 style={{
            fontFamily: 'var(--font-serif, Newsreader, Georgia, serif)',
            fontSize: 24, fontWeight: 500, color: '#1c1f1c',
            letterSpacing: '-0.02em', margin: '0 0 6px',
          }}>
            Mot de passe oublié
          </h1>
          <p style={{ fontSize: 13, color: '#8a8474', margin: 0 }}>
            Saisissez votre email pour recevoir un lien de réinitialisation.
          </p>
        </div>

        {state?.ok ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              background: '#eef5f0', border: '1px solid #c3deca', borderRadius: 12,
              padding: '16px 20px', marginBottom: 20,
            }}>
              <p style={{ fontSize: 14, color: '#2a4f37', margin: 0, lineHeight: 1.6 }}>
                Si cet email correspond à un compte, vous recevrez un lien de réinitialisation dans quelques minutes.
              </p>
            </div>
            <a href="/login" style={{
              display: 'inline-block', background: '#1e3a2f', color: '#f1ede2',
              padding: '10px 24px', borderRadius: 10, textDecoration: 'none',
              fontSize: 14, fontWeight: 600,
            }}>
              Retour à la connexion
            </a>
          </div>
        ) : (
          <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label htmlFor="email" style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#3a4038', marginBottom: 6 }}>
                Votre email
              </label>
              <input
                id="email" name="email" type="email" required autoFocus
                autoComplete="email" placeholder="marie@exemple.fr"
                style={inputStyle} onFocus={focus} onBlur={blur}
              />
            </div>

            {state?.error && (
              <p style={{
                margin: 0, fontSize: 13.5, color: '#b03a2e',
                background: '#fae6e3', border: '1px solid #f5c5bf',
                borderRadius: 10, padding: '10px 14px',
              }}>
                {state.error}
              </p>
            )}

            <button
              type="submit" disabled={pending}
              style={{
                width: '100%', height: 46, borderRadius: 10,
                background: '#1e3a2f', color: '#f1ede2',
                fontSize: 15, fontWeight: 600, border: 'none',
                cursor: pending ? 'not-allowed' : 'pointer',
                opacity: pending ? 0.65 : 1, transition: 'background .15s',
              }}
            >
              {pending ? 'Envoi…' : 'Envoyer le lien'}
            </button>

            <p style={{ textAlign: 'center', margin: 0 }}>
              <a href="/login" style={{ fontSize: 13, color: '#2f5142', textDecoration: 'none' }}>
                ← Retour à la connexion
              </a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
