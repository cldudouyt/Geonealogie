import { runQuery } from '@/lib/neo4j';
import Link from 'next/link';

export const metadata = { title: 'Suggestions reçues — Géonéalogie' };

interface Suggestion {
  s: {
    id: string;
    title: string;
    body: string;
    author: string;
    status: string;
    createdAt: { toString(): string };
  };
}

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
  let suggestions: Suggestion[] = [];
  try {
    suggestions = await runQuery<Suggestion>(
      'MATCH (s:Suggestion) RETURN s ORDER BY s.createdAt DESC',
    );
  } catch {
    // Neo4j might be unavailable in some envs — show empty list
  }

  const statusKey = (s: string): StatusKey =>
    s === 'in_progress' || s === 'resolved' ? (s as StatusKey) : 'open';

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 20px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
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
            <p style={{ fontSize: 13.5, color: '#8a8474', marginTop: 6, margin: '6px 0 0' }}>
              Demandes et corrections envoyées par la famille.
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
              background: '#1e3a2f',
              color: '#f1ede2',
              borderRadius: 10,
              fontSize: 13.5,
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            + Suggérer
          </Link>
        </div>
      </div>

      {/* List */}
      {suggestions.length === 0 ? (
        <div
          style={{
            background: '#fffdf9',
            border: '1px solid #e9e2d2',
            borderRadius: 16,
            padding: '40px 24px',
            textAlign: 'center',
            color: '#9a9080',
            fontSize: 14,
          }}
        >
          Aucune suggestion pour le moment.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {suggestions.map(({ s }) => {
            const sk = statusKey(s.status);
            const st = STATUS_STYLES[sk];
            const createdStr = s.createdAt?.toString ? s.createdAt.toString() : String(s.createdAt);
            return (
              <div
                key={s.id}
                style={{
                  background: '#fffdf9',
                  border: '1px solid #e9e2d2',
                  borderRadius: 16,
                  padding: '18px 20px',
                  display: 'flex',
                  gap: 16,
                  alignItems: 'flex-start',
                }}
              >
                {/* Body */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 15,
                      fontWeight: 700,
                      color: '#1c1f1c',
                    }}
                  >
                    {s.title}
                  </h2>
                  <p
                    style={{
                      margin: '4px 0 0',
                      fontSize: 12,
                      color: '#9a9080',
                    }}
                  >
                    Par {s.author} · {formatDate(createdStr)}
                  </p>
                  {s.body && (
                    <p
                      style={{
                        margin: '11px 0 0',
                        fontSize: 13.5,
                        color: '#4a4f46',
                        lineHeight: 1.55,
                      }}
                    >
                      {s.body}
                    </p>
                  )}
                </div>

                {/* Badge */}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
