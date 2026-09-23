'use client';

import { Suspense, useActionState, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { submitFeedback, type FeedbackState } from '../actions';
import Link from 'next/link';

type ContribType = 'souvenir' | 'correction' | 'identifier';

const FIELDS = [
  'Prénom',
  'Nom',
  'Date de naissance',
  'Lieu de naissance',
  'Date de décès',
  'Lieu de décès',
  'Profession',
  'Notes',
];

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 42,
  padding: '0 14px',
  fontSize: 14,
  color: 'var(--ink-900)',
  background: 'var(--paper-card)',
  border: '1px solid var(--line)',
  borderRadius: 10,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'var(--font-sans)',
  transition: 'border-color .15s, box-shadow .15s',
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  height: 'auto',
  padding: '10px 14px',
  resize: 'none',
  lineHeight: 1.55,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13.5,
  fontWeight: 600,
  color: 'var(--ink-900)',
  marginBottom: 6,
};

function focusStyle(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = 'var(--green-600)';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(47,81,66,.12)';
}

function blurStyle(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = 'var(--line)';
  e.currentTarget.style.boxShadow = 'none';
}

export default function FeedbackNewPage() {
  return (
    <Suspense>
      <FeedbackNewForm />
    </Suspense>
  );
}

function FeedbackNewForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const personId = searchParams.get('person');
  const personName = searchParams.get('name');
  const urlType = searchParams.get('type') as ContribType | null;

  const [selectedType, setSelectedType] = useState<ContribType | null>(
    urlType && ['souvenir', 'correction', 'identifier'].includes(urlType) ? urlType : null,
  );
  const [selectedField, setSelectedField] = useState(FIELDS[0]);

  const [state, action, pending] = useActionState<FeedbackState | null, FormData>(
    submitFeedback,
    null,
  );

  const autoTitle =
    selectedType === 'souvenir'
      ? personName
        ? `Souvenir : ${personName}`
        : 'Souvenir'
      : selectedType === 'identifier'
        ? personName
          ? `Identification photo : ${personName}`
          : 'Identification photo'
        : '';

  if (state?.success) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '20px' }}>
        <div
          style={{
            maxWidth: 520,
            width: '100%',
            background: 'var(--paper-card)',
            border: '1px solid var(--line)',
            borderRadius: 16,
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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--green-700)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 22,
              fontWeight: 500,
              color: 'var(--ink-900)',
              margin: '0 0 10px',
              letterSpacing: '-0.02em',
            }}
          >
            Merci !
          </h2>
          <p style={{ fontSize: 13.5, color: 'var(--ink-600)', margin: '0 0 24px', lineHeight: 1.55 }}>
            Votre contribution a bien été envoyée et sera étudiée.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => router.back()}
              style={{
                height: 38,
                padding: '0 18px',
                background: 'var(--green-700)',
                color: '#f1ede2',
                border: 'none',
                borderRadius: 10,
                fontSize: 13.5,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
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
                background: 'var(--paper-card)',
                color: 'var(--green-700)',
                border: '1px solid var(--line)',
                borderRadius: 10,
                fontSize: 13.5,
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              Nouvelle contribution
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
          maxWidth: 560,
          width: '100%',
          background: 'var(--paper-card)',
          border: '1px solid var(--line)',
          borderRadius: 16,
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
            color: 'var(--ink-500)',
            cursor: 'pointer',
            marginBottom: 20,
            display: 'inline-block',
            fontFamily: 'var(--font-sans)',
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
            color: 'var(--ink-900)',
            margin: '0 0 6px',
            letterSpacing: '-0.02em',
          }}
        >
          Contribuer
        </h1>
        <p style={{ fontSize: 13.5, color: 'var(--ink-600)', margin: '0 0 24px', lineHeight: 1.5 }}>
          Choisissez le type de contribution que vous souhaitez apporter.
        </p>

        {/* Person chip */}
        {personId && personName && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#eef2ec',
              color: 'var(--green-700)',
              borderRadius: 999,
              padding: '5px 12px',
              fontSize: 12.5,
              fontWeight: 600,
              marginBottom: 24,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Fiche concernée : {personName}
          </div>
        )}

        {/* Type selector */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 28 }}>
          {(
            [
              { key: 'souvenir' as ContribType, emoji: '📖', label: 'Souvenir', sub: 'Anecdote ou récit' },
              { key: 'correction' as ContribType, emoji: '✏️', label: 'Correction', sub: 'Proposer une correction' },
              { key: 'identifier' as ContribType, emoji: '🖼️', label: 'Identifier', sub: 'Reconnaître sur une photo' },
            ] as const
          ).map(({ key, emoji, label, sub }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedType(key)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                padding: '14px 8px',
                borderRadius: 12,
                border: selectedType === key
                  ? '2px solid var(--green-600)'
                  : '1px solid var(--line)',
                background: selectedType === key ? '#eef2ec' : 'var(--paper-body)',
                cursor: 'pointer',
                transition: 'border-color .15s, background .15s',
                fontFamily: 'var(--font-sans)',
              }}
            >
              <span style={{ fontSize: 22 }}>{emoji}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-900)' }}>{label}</span>
              <span style={{ fontSize: 11, color: 'var(--ink-500)', lineHeight: 1.35, textAlign: 'center' }}>{sub}</span>
            </button>
          ))}
        </div>

        {/* Form (shown only when type selected) */}
        {selectedType && (
          <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Hidden fields */}
            <input type="hidden" name="type" value={selectedType} />
            {autoTitle && <input type="hidden" name="title" value={autoTitle} />}
            {personId && <input type="hidden" name="personId" value={personId} />}
            {personName && <input type="hidden" name="personName" value={personName} />}

            {/* Author */}
            <div>
              <label htmlFor="name" style={labelStyle}>
                Votre prénom{' '}
                <span style={{ fontWeight: 400, color: 'var(--ink-500)' }}>(optionnel)</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="given-name"
                placeholder="Marie"
                style={inputStyle}
                onFocus={focusStyle}
                onBlur={blurStyle}
              />
            </div>

            {/* Souvenir fields */}
            {selectedType === 'souvenir' && (
              <div>
                <label htmlFor="description" style={labelStyle}>
                  Votre souvenir{' '}
                  <span style={{ color: '#d98b82' }}>*</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  required
                  rows={5}
                  placeholder="Racontez votre anecdote ou souvenir…"
                  style={textareaStyle}
                  onFocus={focusStyle}
                  onBlur={blurStyle}
                />
              </div>
            )}

            {/* Correction fields */}
            {selectedType === 'correction' && (
              <>
                <div>
                  <label htmlFor="fieldName" style={labelStyle}>
                    Champ à corriger{' '}
                    <span style={{ color: '#d98b82' }}>*</span>
                  </label>
                  <select
                    id="fieldName"
                    name="fieldName"
                    required
                    value={selectedField}
                    onChange={e => setSelectedField(e.target.value)}
                    style={{ ...inputStyle, cursor: 'pointer', appearance: 'auto' }}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                  >
                    {FIELDS.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="suggestedValue" style={labelStyle}>
                    Valeur proposée{' '}
                    <span style={{ color: '#d98b82' }}>*</span>
                  </label>
                  <input
                    id="suggestedValue"
                    name="suggestedValue"
                    type="text"
                    required
                    placeholder="La valeur correcte…"
                    style={inputStyle}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                  />
                </div>
                <div>
                  <label htmlFor="description" style={labelStyle}>
                    Précisions{' '}
                    <span style={{ fontWeight: 400, color: 'var(--ink-500)' }}>(optionnel)</span>
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    placeholder="Expliquez pourquoi cette valeur est correcte, source…"
                    style={textareaStyle}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                  />
                </div>
              </>
            )}

            {/* Identifier fields */}
            {selectedType === 'identifier' && (
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
                  placeholder="Décrivez qui vous reconnaissez et sur quelle photo…"
                  style={textareaStyle}
                  onFocus={focusStyle}
                  onBlur={blurStyle}
                />
              </div>
            )}

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
                background: pending ? 'var(--green-600)' : 'var(--green-700)',
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
            >
              {pending ? 'Envoi en cours…' : 'Envoyer la contribution'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
