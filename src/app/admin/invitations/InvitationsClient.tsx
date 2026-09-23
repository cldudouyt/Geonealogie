'use client';

import React, { useState, useTransition } from 'react';
import type { InvitationRecord, DbUser } from '@/lib/db';

const ROLE_LABELS: Record<string, string> = {
  reader: 'Lecteur',
  contributor: 'Contributeur',
  admin: 'Administrateur',
};

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  reader: { bg: '#f0f0f0', color: '#555' },
  contributor: { bg: '#dde7f1', color: '#3f617f' },
  admin: { bg: '#f3eef8', color: '#6b4a8a' },
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return iso; }
}

interface Props {
  initialInvitations: InvitationRecord[];
  initialDbUsers: DbUser[];
  baseUrl: string;
}

export default function InvitationsClient({ initialInvitations, initialDbUsers, baseUrl }: Props) {
  const [invitations, setInvitations] = useState<InvitationRecord[]>(initialInvitations);
  const [dbUsers, setDbUsers] = useState<DbUser[]>(initialDbUsers);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'reader' | 'contributor' | 'admin'>('reader');
  const [suggestedName, setSuggestedName] = useState('');
  const [error, setError] = useState('');
  const [copiedToken, setCopiedToken] = useState('');
  const [, startTransition] = useTransition();

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/admin/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role, suggestedName: suggestedName || undefined }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Erreur'); return; }
    setEmail(''); setSuggestedName('');
    const res2 = await fetch('/api/admin/invitations');
    const d2 = await res2.json();
    setInvitations(d2.invitations || []);
  }

  async function handleDelete(token: string) {
    await fetch('/api/admin/invitations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    setInvitations((inv: InvitationRecord[]) => inv.filter((i: InvitationRecord) => i.token !== token));
  }

  async function handleDeleteUser(id: string) {
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    setDbUsers((users: DbUser[]) => users.filter((u: DbUser) => u.id !== id));
  }

  function copyLink(token: string) {
    const url = `${baseUrl}/invite/${token}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(''), 2000);
  }

  const inputCls: React.CSSProperties & { flex?: string } = {
    height: 40, padding: '0 12px', fontSize: 13.5,
    border: '1px solid var(--line)', borderRadius: 9,
    background: 'var(--paper-card)', color: 'var(--ink-900)',
    fontFamily: 'var(--font-sans)', outline: 'none',
    transition: 'border-color .15s',
  };

  const pending = invitations.filter((i: InvitationRecord) => !i.usedAt && new Date(i.expiresAt) > new Date());
  const used = invitations.filter((i: InvitationRecord) => i.usedAt);
  const expired = invitations.filter((i: InvitationRecord) => !i.usedAt && new Date(i.expiresAt) <= new Date());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Create invitation form */}
      <div style={{ background: 'var(--paper-card)', border: '1px solid var(--line)', borderRadius: 16, padding: '24px' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 500, color: 'var(--ink-900)', margin: '0 0 16px' }}>
          Envoyer une invitation
        </h2>
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              type="email" required placeholder="Email du proche" value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ ...inputCls, flex: '2 1 200px' }}
            />
            <input
              type="text" placeholder="Prénom (optionnel)" value={suggestedName}
              onChange={e => setSuggestedName(e.target.value)}
              style={{ ...inputCls, flex: '1 1 140px' }}
            />
            <select
              value={role} onChange={e => setRole(e.target.value as typeof role)}
              style={{ ...inputCls, flex: '1 1 140px' }}
            >
              <option value="reader">Lecteur</option>
              <option value="contributor">Contributeur</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>
          {error && <p style={{ margin: 0, fontSize: 13, color: '#b03a2e' }}>{error}</p>}
          <div>
            <button type="submit" style={{
              height: 38, padding: '0 20px', background: 'var(--green-700)', color: '#f1ede2',
              border: 'none', borderRadius: 9, fontSize: 13.5, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}>
              Envoyer l'invitation
            </button>
            {!process.env.RESEND_API_KEY && (
              <span style={{ marginLeft: 12, fontSize: 12, color: 'var(--ink-500)' }}>
                (lien à copier — email non configuré)
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Pending invitations */}
      {pending.length > 0 && (
        <section>
          <h2 style={{ fontSize: 14, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-500)', margin: '0 0 10px' }}>
            En attente ({pending.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pending.map(inv => {
              const rc = ROLE_COLORS[inv.role] ?? ROLE_COLORS.reader;
              return (
                <div key={inv.token} style={{
                  background: 'var(--paper-card)', border: '1px solid var(--line)', borderRadius: 12,
                  padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-900)' }}>{inv.email}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 2 }}>
                      Créée le {formatDate(inv.createdAt)} · expire le {formatDate(inv.expiresAt)}
                    </div>
                  </div>
                  <span style={{ ...rc, borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 500 }}>
                    {ROLE_LABELS[inv.role]}
                  </span>
                  <button
                    onClick={() => copyLink(inv.token)}
                    style={{
                      height: 32, padding: '0 14px', background: copiedToken === inv.token ? 'var(--ok-bg)' : 'var(--paper-body)',
                      border: '1px solid var(--line)', borderRadius: 8, fontSize: 12.5, fontWeight: 500,
                      cursor: 'pointer', color: copiedToken === inv.token ? 'var(--ok-fg)' : 'var(--ink-600)',
                      fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap',
                    }}
                  >
                    {copiedToken === inv.token ? '✓ Copié !' : 'Copier le lien'}
                  </button>
                  <button
                    onClick={() => handleDelete(inv.token)}
                    style={{
                      height: 32, padding: '0 12px', background: 'none',
                      border: '1px solid var(--line)', borderRadius: 8, fontSize: 12,
                      cursor: 'pointer', color: '#b03a2e', fontFamily: 'var(--font-sans)',
                    }}
                  >
                    Annuler
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* DB Users */}
      {dbUsers.length > 0 && (
        <section>
          <h2 style={{ fontSize: 14, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-500)', margin: '0 0 10px' }}>
            Membres invités ({dbUsers.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {dbUsers.map(u => {
              const rc = ROLE_COLORS[u.role] ?? ROLE_COLORS.reader;
              return (
                <div key={u.id} style={{
                  background: 'var(--paper-card)', border: '1px solid var(--line)', borderRadius: 12,
                  padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-900)' }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 2 }}>
                      Depuis le {formatDate(u.createdAt)}
                    </div>
                  </div>
                  <span style={{ ...rc, borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 500 }}>
                    {ROLE_LABELS[u.role]}
                  </span>
                  <button
                    onClick={() => startTransition(() => { handleDeleteUser(u.id); })}
                    style={{
                      height: 32, padding: '0 12px', background: 'none',
                      border: '1px solid var(--line)', borderRadius: 8, fontSize: 12,
                      cursor: 'pointer', color: '#b03a2e', fontFamily: 'var(--font-sans)',
                    }}
                  >
                    Révoquer
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Used + expired */}
      {(used.length > 0 || expired.length > 0) && (
        <section>
          <h2 style={{ fontSize: 14, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-500)', margin: '0 0 10px' }}>
            Historique
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[...used, ...expired].map(inv => (
              <div key={inv.token} style={{
                background: 'var(--paper-body)', border: '1px solid var(--line)', borderRadius: 10,
                padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, opacity: 0.7,
              }}>
                <div style={{ flex: 1, fontSize: 13, color: 'var(--ink-600)' }}>
                  {inv.email}
                  {inv.usedAt && <span style={{ marginLeft: 8, color: 'var(--ok-fg)' }}>✓ Utilisée par {inv.usedBy}</span>}
                  {!inv.usedAt && <span style={{ marginLeft: 8, color: '#9a9080' }}>Expirée</span>}
                </div>
                <button
                  onClick={() => handleDelete(inv.token)}
                  style={{
                    height: 26, padding: '0 10px', background: 'none', border: 'none',
                    cursor: 'pointer', color: 'var(--ink-500)', fontSize: 12, fontFamily: 'var(--font-sans)',
                  }}
                >
                  Supprimer
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {invitations.length === 0 && dbUsers.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '40px 20px', color: 'var(--ink-500)',
          background: 'var(--paper-card)', border: '1px solid var(--line)', borderRadius: 16,
        }}>
          Aucune invitation pour le moment.
        </div>
      )}
    </div>
  );
}
