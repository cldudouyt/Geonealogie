'use client';

import { useActionState } from 'react';
import { claimInvitation, type ClaimState } from './actions';

const inputStyle: React.CSSProperties = {
  width: '100%', height: 44, padding: '0 14px', fontSize: 14,
  color: 'var(--ink-900)', background: 'var(--paper-card)',
  border: '1px solid var(--line)', borderRadius: 10, outline: 'none',
  boxSizing: 'border-box', fontFamily: 'var(--font-sans)',
  transition: 'border-color .15s, box-shadow .15s',
};
const focus = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.borderColor = 'var(--green-600)';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(47,81,66,.12)';
};
const blur = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.borderColor = 'var(--line)';
  e.currentTarget.style.boxShadow = 'none';
};

interface Props {
  token: string;
  roleLabel: string;
  suggestedName?: string;
  createdBy: string;
  email: string;
}

export default function InviteForm({ token, roleLabel, suggestedName, createdBy, email }: Props) {
  const [state, action, pending] = useActionState<ClaimState | null, FormData>(claimInvitation, null);

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
        position: 'relative', width: '100%', maxWidth: 400,
        background: 'var(--paper-card)', borderRadius: 22,
        padding: '38px 34px', boxShadow: '0 30px 80px -30px rgba(0,0,0,.6)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 52, height: 52, borderRadius: 15,
            background: 'linear-gradient(145deg, #2f5142 0%, #1e3a2f 100%)', marginBottom: 14,
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#c9a86a" strokeWidth="1.8" strokeLinecap="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
              <path d="M16 11l2 2 4-4"/>
            </svg>
          </div>
          <h1 style={{
            fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 500,
            color: 'var(--ink-900)', letterSpacing: '-0.02em', margin: '0 0 6px',
          }}>
            Rejoindre Géonéalogie
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ink-500)', margin: 0 }}>
            Invité par <strong>{createdBy}</strong> · rôle <strong>{roleLabel}</strong>
          </p>
        </div>

        <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input type="hidden" name="token" value={token} />

          <div>
            <label htmlFor="name" style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink-900)', marginBottom: 6 }}>
              Votre prénom et nom <span style={{ color: '#d98b82' }}>*</span>
            </label>
            <input
              id="name" name="name" type="text" required autoFocus
              autoComplete="name" placeholder="Marie Dupont"
              defaultValue={suggestedName}
              style={inputStyle} onFocus={focus} onBlur={blur}
            />
          </div>

          {/* Email info box */}
          <div style={{
            background: 'var(--paper-body)', border: '1px solid var(--line)', borderRadius: 10,
            padding: '12px 14px', fontSize: 13, color: 'var(--ink-600)', lineHeight: 1.5,
          }}>
            <strong style={{ color: 'var(--ink-900)' }}>Votre email de connexion :</strong><br />
            <span style={{ fontFamily: 'monospace', fontSize: 13.5 }}>{email}</span>
            <br /><br />
            Après avoir activé votre compte, vous recevrez un code par email pour définir votre mot de passe.
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
              background: 'var(--green-700)', color: '#f1ede2',
              fontSize: 15, fontWeight: 600, border: 'none',
              cursor: pending ? 'not-allowed' : 'pointer',
              opacity: pending ? 0.7 : 1, transition: 'background .15s, opacity .15s',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {pending ? 'Activation…' : 'Activer mon accès'}
          </button>
        </form>
      </div>
    </div>
  );
}
