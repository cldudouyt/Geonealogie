'use client';

import { useState, useTransition, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { requestReset, applyReset } from './actions';

const cardStyle: React.CSSProperties = {
  position: 'relative', width: '100%', maxWidth: 400,
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
  transition: 'background .15s', fontFamily: 'inherit',
};
const focus = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.borderColor = '#2f5142';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(47,81,66,.12)';
};
const blur = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.borderColor = '#e0d8c6';
  e.currentTarget.style.boxShadow = 'none';
};

function LockIcon() {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 52, height: 52, borderRadius: 15,
      background: 'linear-gradient(145deg, #2f5142 0%, #1e3a2f 100%)', marginBottom: 14,
    }}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#c9a86a" strokeWidth="1.8" strokeLinecap="round">
        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <p style={{
      margin: 0, fontSize: 13.5, color: '#b03a2e',
      background: '#fae6e3', border: '1px solid #f5c5bf',
      borderRadius: 10, padding: '10px 14px',
    }}>{msg}</p>
  );
}

function ResetPageInner() {
  const searchParams = useSearchParams();
  const prefilledEmail = searchParams.get('email') || '';
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [token, setToken] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleEmailSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const rawEmail = fd.get('email')?.toString() || '';
    // Mask email for display: mar***@exemple.fr
    const [local, domain] = rawEmail.split('@');
    const masked = local.slice(0, 3) + '***@' + (domain || '');
    setError('');
    startTransition(async () => {
      const result = await requestReset(null, fd);
      if (result?.error) { setError(result.error); return; }
      if (result?.token) { setToken(result.token); setMaskedEmail(masked); setStep('otp'); }
    });
  }

  function handleOtpSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('token', token);
    setError('');
    startTransition(async () => {
      const result = await applyReset(null, fd);
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
          <LockIcon />
          <h1 style={{
            fontFamily: 'var(--font-serif, Newsreader, Georgia, serif)',
            fontSize: 24, fontWeight: 500, color: '#1c1f1c',
            letterSpacing: '-0.02em', margin: '0 0 6px',
          }}>
            {prefilledEmail ? 'Créer votre mot de passe' : 'Mot de passe oublié'}
          </h1>
          <p style={{ fontSize: 13, color: '#8a8474', margin: 0 }}>
            {step === 'email'
              ? (prefilledEmail ? 'Votre compte est activé. Cliquez pour recevoir votre code.' : 'Saisissez votre email pour recevoir un code.')
              : `Code envoyé à ${maskedEmail}`}
          </p>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label htmlFor="reset-email" style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#3a4038', marginBottom: 6 }}>
                Votre email
              </label>
              <input
                id="reset-email" name="email" type="email" required autoFocus
                autoComplete="email" placeholder="marie@exemple.fr"
                defaultValue={prefilledEmail}
                style={inputStyle} onFocus={focus} onBlur={blur}
              />
            </div>
            {error && <ErrorBox msg={error} />}
            <button type="submit" disabled={isPending} style={{ ...btnStyle, opacity: isPending ? 0.65 : 1 }}>
              {isPending ? 'Envoi…' : 'Envoyer le code'}
            </button>
            <p style={{ textAlign: 'center', margin: 0 }}>
              <a href="/login" style={{ fontSize: 13, color: '#2f5142', textDecoration: 'none' }}>← Retour à la connexion</a>
            </p>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label htmlFor="otp" style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#3a4038', marginBottom: 6 }}>
                Code de vérification
              </label>
              <input
                id="otp" name="otp" type="text" required autoFocus
                inputMode="numeric" maxLength={6} placeholder="123456"
                style={{
                  ...inputStyle, textAlign: 'center', fontSize: 26,
                  fontWeight: 700, letterSpacing: '0.3em', fontFamily: 'monospace',
                }}
                onFocus={focus} onBlur={blur}
              />
              <p style={{ fontSize: 12, color: '#8a8474', margin: '6px 0 0' }}>
                Valable 15 minutes. Vérifiez vos spams si besoin.
              </p>
            </div>

            <div>
              <label htmlFor="password" style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#3a4038', marginBottom: 6 }}>
                Nouveau mot de passe
              </label>
              <input
                id="password" name="password" type="password" required
                autoComplete="new-password" placeholder="8 caractères minimum"
                style={inputStyle} onFocus={focus} onBlur={blur}
              />
            </div>

            <div>
              <label htmlFor="confirm" style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#3a4038', marginBottom: 6 }}>
                Confirmer
              </label>
              <input
                id="confirm" name="confirm" type="password" required
                autoComplete="new-password" placeholder="••••••••"
                style={inputStyle} onFocus={focus} onBlur={blur}
              />
            </div>

            {error && <ErrorBox msg={error} />}

            <button type="submit" disabled={isPending} style={{ ...btnStyle, opacity: isPending ? 0.65 : 1 }}>
              {isPending ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
            </button>

            <p style={{ textAlign: 'center', margin: 0 }}>
              <button
                type="button"
                onClick={() => { setStep('email'); setError(''); }}
                style={{ background: 'none', border: 'none', fontSize: 13, color: '#2f5142', cursor: 'pointer', padding: 0 }}
              >
                ← Ressaisir mon email
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPage() {
  return (
    <Suspense>
      <ResetPageInner />
    </Suspense>
  );
}
