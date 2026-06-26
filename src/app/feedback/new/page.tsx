'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { submitFeedback, type FeedbackState } from '../actions';
import Link from 'next/link';

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 42,
  padding: '0 14px',
  fontSize: 14,
  color: '#1c1f1c',
  background: '#fffdf9',
  border: '1px solid #e0d8c6',
  borderRadius: 10,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'var(--font-sans)',
  transition: 'border-color .15s, box-shadow .15s',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13.5,
  fontWeight: 600,
  color: '#1c1f1c',
  marginBottom: 6,
};

export default function FeedbackNewPage() {
  const router = useRouter();
  const [state, action, pending] = useActionState<FeedbackState | null, FormData>(
    submitFeedback,
    null,
  );

  if (state?.success) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '20px' }}>
        <div
          style={{
            maxWidth: 520,
            width: '100%',
            background: '#fffdf9',
            border: '1px solid #e9e2d2',
            borderRadius: 18,
            padding: '40px 32px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: '#eef2ec',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2f5142" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 22,
              fontWeight: 500,
              color: '#1c1f1c',
              margin: '0 0 10px',
              letterSpacing: '-0.02em',
            }}
          >
            Merci !
          </h2>
          <p style={{ fontSize: 13.5, color: '#6c7064', margin: '0 0 24px', lineHeight: 1.55 }}>
            Votre suggestion a bien été envoyée et sera étudiée.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => router.back()}
              style={{
                height: 38,
                padding: '0 18px',
                background: '#1e3a2f',
                color: '#f1ede2',
                border: 'none',
                borderRadius: 10,
                fontSize: 13.5,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              ← Retour
            </button>
            <Link
              href="/feedback/new"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 38,
                padding: '0 18px',
                background: '#fffdf9',
                color: '#2f5142',
                border: '1px solid #e0d8c6',
                borderRadius: 10,
                fontSize: 13.5,
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              Nouvelle suggestion
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 20px' }}>
      <div
        style={{
          maxWidth: 520,
          width: '100%',
          background: '#fffdf9',
          border: '1px solid #e9e2d2',
          borderRadius: 18,
          padding: 32,
          margin: '0 auto',
        }}
      >
        {/* Back link */}
        <button
          onClick={() => router.back()}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            fontSize: 13,
            color: '#9a9080',
            cursor: 'pointer',
            marginBottom: 20,
            display: 'inline-block',
          }}
        >
          ← Retour
        </button>

        {/* Title */}
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 26,
            fontWeight: 500,
            color: '#1c1f1c',
            margin: '0 0 6px',
            letterSpacing: '-0.02em',
          }}
        >
          Suggérer une amélioration
        </h1>
        <p style={{ fontSize: 13.5, color: '#6c7064', margin: '0 0 28px', lineHeight: 1.5 }}>
          Une idée, une erreur à corriger ou une fonctionnalité manquante ?
        </p>

        <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Prénom */}
          <div>
            <label htmlFor="name" style={labelStyle}>
              Votre prénom{' '}
              <span style={{ fontWeight: 400, color: '#9a9080' }}>(optionnel)</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="given-name"
              placeholder="Marie"
              style={inputStyle}
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

          {/* Titre */}
          <div>
            <label htmlFor="title" style={labelStyle}>
              Titre de la suggestion{' '}
              <span style={{ color: '#d98b82' }}>*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              placeholder="Ex : Ajouter un export PDF de la fiche"
              style={inputStyle}
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

          {/* Description */}
          <div>
            <label htmlFor="description" style={labelStyle}>
              Description{' '}
              <span style={{ color: '#d98b82' }}>*</span>
            </label>
            <textarea
              id="description"
              name="description"
              required
              rows={5}
              placeholder="Décrivez votre idée ou le problème rencontré en détail…"
              style={{
                ...inputStyle,
                height: 'auto',
                padding: '10px 14px',
                resize: 'none',
                lineHeight: 1.55,
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

          {/* Error */}
          {state?.error && (
            <p
              style={{
                margin: 0,
                fontSize: 13.5,
                color: '#b03a2e',
                background: '#fae6e3',
                border: '1px solid #f5c5bf',
                borderRadius: 10,
                padding: '10px 14px',
              }}
            >
              {state.error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={pending}
            style={{
              width: '100%',
              height: 44,
              background: pending ? '#2f5142' : '#1e3a2f',
              color: '#f1ede2',
              border: 'none',
              borderRadius: 11,
              fontSize: 14,
              fontWeight: 600,
              cursor: pending ? 'not-allowed' : 'pointer',
              opacity: pending ? 0.7 : 1,
              fontFamily: 'var(--font-sans)',
              transition: 'background .15s, opacity .15s',
            }}
            onMouseEnter={(e) => {
              if (!pending) e.currentTarget.style.background = '#15271f';
            }}
            onMouseLeave={(e) => {
              if (!pending) e.currentTarget.style.background = '#1e3a2f';
            }}
          >
            {pending ? 'Envoi en cours…' : 'Envoyer la suggestion'}
          </button>
        </form>
      </div>
    </div>
  );
}
