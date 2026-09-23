import { hasDb, listSuggestions, type SuggestionRow } from '@/lib/db';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { permits } from '@/lib/auth';
import { StatusUpdater } from './StatusUpdater';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Contributions reçues — Géonéalogie' };

type StatusKey = 'open' | 'in_progress' | 'resolved';

const STATUS_LABELS: Record<StatusKey, string> = {
  open: 'Ouvert',
  in_progress: 'En cours',
  resolved: 'Résolu',
};

const STATUS_STYLES: Record<StatusKey, { bg: string; text: string; border: string }> = {
  open: { bg: '#e9eff5', text: '#3f617f', border: '#cdddea' },
  in_progress: { bg: '#f8eecf', text: '#8a6d12', border: '#ecd9a3' },
  resolved: { bg: '#e6f0e9', text: '#2f5142', border: '#c2dccb' },
};

type TypeKey = 'souvenir' | 'correction' | 'identifier' | 'general';

const TYPE_META: Record<TypeKey, { label: string; emoji: string; bg: string; color: string }> = {
  souvenir: { label: 'Souvenir', emoji: '📖', bg: 'var(--ok-bg, #eef2ec)', color: 'var(--ok-fg, #2f5142)' },
  correction: { label: 'Correction', emoji: '✏️', bg: '#e9eff5', color: '#3f617f' },
  identifier: { label: 'Identification', emoji: '🖼️', bg: '#f3eef8', color: '#6b4a8a' },
  general: { label: 'Général', emoji: '💬', bg: 'var(--paper-body, #f4f1ea)', color: 'var(--ink-500, #6c7064)' },
};

function formatDate(raw: string): string {
  try {
    const d = new Date(raw);
    return d.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return raw;
  }
}

export default async function FeedbackPage() {
  const session = await getSession();
  if (!session || !permits(session.role, 'contributor')) {
    redirect('/');
  }

  const isAdmin = session != null && permits(session.role, 'admin');

  let suggestions: SuggestionRow[] = [];
  try {
    if (hasDb()) suggestions = await listSuggestions();
  } catch {
    // DB might be unavailable in some envs — show empty list
  }

  const statusKey = (s: string): StatusKey =>
    s === 'in_progress' || s === 'resolved' ? (s as StatusKey) : 'open';

  const typeKey = (t: string): TypeKey =>
    ['souvenir', 'correction', 'identifier'].includes(t) ? (t as TypeKey) : 'general';

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 30,
                fontWeight: 500,
                color: 'var(--ink-900, #1c1f1c)',
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              Contributions reçues
            </h1>
            <p style={{ fontSize: 13.5, color: 'var(--ink-500, #8a8474)', marginTop: 6, margin: '6px 0 0' }}>
              Souvenirs, corrections et identifications envoyés par la famille.
            </p>
          </div>
          <Link
            href="/feedback/new"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              height: 38,
              padding: '0 16px',
              background: 'var(--green-700, #1e3a2f)',
              color: '#f1ede2',
              borderRadius: 10,
              fontSize: 13.5,
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            + Contribuer
          </Link>
        </div>
      </div>

      {/* List */}
      {suggestions.length === 0 ? (
        <div
          style={{
            background: 'var(--paper-card, #fffdf9)',
            border: '1px solid var(--line, #e9e2d2)',
            borderRadius: 16,
            padding: '40px 24px',
            textAlign: 'center',
            color: 'var(--ink-500, #9a9080)',
            fontSize: 14,
          }}
        >
          Aucune contribution pour le moment.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {suggestions.map(s => {
            const sk = statusKey(s.status);
            const st = STATUS_STYLES[sk];
            const tk = typeKey(s.type);
            const tm = TYPE_META[tk];
            return (
              <div
                key={s.id}
                style={{
                  background: 'var(--paper-card, #fffdf9)',
                  border: '1px solid var(--line, #e9e2d2)',
                  borderRadius: 16,
                  padding: '18px 20px',
                }}
              >
                {/* Top row: title + status badge */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Type badge */}
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        background: tm.bg,
                        color: tm.color,
                        borderRadius: 999,
                        padding: '2px 9px',
                        fontSize: 11.5,
                        fontWeight: 600,
                        marginBottom: 6,
                      }}
                    >
                      {tm.emoji} {tm.label}
                    </span>

                    <h2
                      style={{
                        margin: 0,
                        fontSize: 15,
                        fontWeight: 700,
                        color: 'var(--ink-900, #1c1f1c)',
                      }}
                    >
                      {s.title}
                    </h2>
                    <p
                      style={{
                        margin: '4px 0 0',
                        fontSize: 12,
                        color: 'var(--ink-500, #9a9080)',
                      }}
                    >
                      Par {s.author} · {formatDate(s.createdAt)}
                      {s.personId && (
                        <>
                          {' · '}
                          <Link
                            href={`/person/${s.personId}`}
                            style={{ color: 'var(--green-600, #2f5142)', textDecoration: 'underline' }}
                          >
                            Voir la fiche →
                          </Link>
                        </>
                      )}
                    </p>

                    {/* Correction detail */}
                    {tk === 'correction' && s.fieldName && (
                      <div
                        style={{
                          marginTop: 10,
                          display: 'inline-flex',
                          gap: 8,
                          alignItems: 'center',
                          background: '#e9eff5',
                          borderRadius: 8,
                          padding: '6px 12px',
                          fontSize: 12.5,
                          color: '#3f617f',
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{s.fieldName}</span>
                        {s.suggestedValue && (
                          <>
                            <span style={{ opacity: 0.5 }}>→</span>
                            <span style={{ fontStyle: 'italic' }}>{s.suggestedValue}</span>
                          </>
                        )}
                      </div>
                    )}

                    {s.body && (
                      <p
                        style={{
                          margin: '10px 0 0',
                          fontSize: 13.5,
                          color: 'var(--ink-600, #4a4f46)',
                          lineHeight: 1.55,
                        }}
                      >
                        {s.body}
                      </p>
                    )}
                  </div>

                  {/* Status badge */}
                  <span
                    style={{
                      alignSelf: 'flex-start',
                      flexShrink: 0,
                      background: st.bg,
                      color: st.text,
                      border: `1px solid ${st.border}`,
                      borderRadius: 999,
                      padding: '3px 10px',
                      fontSize: 12,
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {STATUS_LABELS[sk]}
                  </span>
                </div>

                {/* Admin status updater */}
                {isAdmin && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line, #e9e2d2)' }}>
                    <StatusUpdater id={s.id} current={sk} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
