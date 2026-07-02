import { hasDb, listSuggestions, type SuggestionRow } from '@/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Suggestions reçues (admin) — Géonéalogie' };

export default async function AdminFeedbackPage() {
  let feedbacks: SuggestionRow[] = [];
  try {
    if (hasDb()) feedbacks = await listSuggestions();
  } catch {
    // DB might be unavailable in some envs — show empty list
  }

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 20px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 13,
            color: '#8a8474',
            textDecoration: 'none',
            marginBottom: 10,
          }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour à l&apos;accueil
        </Link>
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 30,
            fontWeight: 500,
            color: '#1c1f1c',
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          Suggestions reçues
        </h1>
        <p style={{ fontSize: 13.5, color: '#8a8474', margin: '6px 0 0' }}>
          {feedbacks.length} suggestion{feedbacks.length > 1 ? 's' : ''} envoyée{feedbacks.length > 1 ? 's' : ''} par la famille.
        </p>
      </div>

      {/* List */}
      {feedbacks.length === 0 ? (
        <div
          style={{
            background: '#fffdf9',
            border: '1px solid #e7e0d0',
            borderRadius: 16,
            padding: '40px 24px',
            textAlign: 'center',
            color: '#9aa89b',
            fontSize: 14,
          }}
        >
          Aucune suggestion reçue pour l&apos;instant.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {feedbacks.map(f => (
            <div
              key={f.id}
              style={{
                background: '#fffdf9',
                border: '1px solid #e7e0d0',
                borderRadius: 16,
                padding: '18px 20px',
                display: 'flex',
                gap: 16,
                alignItems: 'flex-start',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1c1f1c' }}>
                  {f.title}
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9aa89b' }}>
                  Par {f.author} ·{' '}
                  {new Date(f.createdAt).toLocaleDateString('fr-FR', {
                    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
                <p style={{ margin: '11px 0 0', fontSize: 13.5, color: '#5a5e52', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                  {f.body}
                </p>
              </div>

              <span
                style={{
                  alignSelf: 'flex-start',
                  flexShrink: 0,
                  background: '#eef2ec',
                  color: '#2f5142',
                  borderRadius: 999,
                  padding: '3px 10px',
                  fontSize: 12,
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                }}
              >
                {f.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
