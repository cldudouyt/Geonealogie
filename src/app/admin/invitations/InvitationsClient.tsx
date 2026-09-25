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
  const [createdUrl, setCreatedUrl] = useState('');
  const [emailError, setEmailError] = useState('');
  const [copiedToken, setCopiedToken] = useState('');
  const [copiedNew, setCopiedNew] = useState(false);
  const [resetUrl, setResetUrl] = useState('');
  const [resetUserId, setResetUserId] = useState('');
  const [copiedReset, setCopiedReset] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState('');
  const [userError, setUserError] = useState<{ id: string; message: string } | null>(null);
  const [, startTransition] = useTransition();

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(''); setCreatedUrl(''); setEmailError('');
    const res = await fetch('/api/admin/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role, suggestedName: suggestedName || undefined }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Erreur'); return; }
    setEmail(''); setSuggestedName('');
    if (data.inviteUrl) setCreatedUrl(data.inviteUrl);
    if (data.emailError) setEmailError(data.emailError);
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
    setUserError(null);
    if (confirmRevoke !== id) { setConfirmRevoke(id); return; }
    setConfirmRevoke('');
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setUserError({ id, message: data.error || 'Révocation impossible.' });
        return;
      }
      setDbUsers((users: DbUser[]) => users.filter((u: DbUser) => u.id !== id));
    } catch {
      setUserError({ id, message: 'Révocation impossible : connexion interrompue.' });
    }
  }

  async function handleResetUser(user: DbUser) {
    setResetUrl(''); setResetUserId(user.id); setCopiedReset(false);
    const res = await fetch('/api/admin/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email || '',
        role: user.role,
        resetForUserId: user.id,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Réinitialisation impossible'); return; }
    setError('');
    if (data.inviteUrl) setResetUrl(data.inviteUrl);
    const res2 = await fetch('/api/admin/invitations');
    const d2 = await res2.json();
    setInvitations(d2.invitations || []);
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
          <button type="submit" style={{
            height: 38, padding: '0 20px', background: 'var(--green-700)', color: '#f1ede2',
            border: 'none', borderRadius: 9, fontSize: 13.5, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'var(--font-sans)',
          }}>
            Envoyer l'invitation
          </button>
        </form>
      </div>

      {/* Post-create: show invite link + email status */}
      {createdUrl && (
        <div style={{
          background: emailError ? '#fff8f0' : '#f0f7f2',
          border: `1px solid ${emailError ? '#f5c89a' : '#a8d4b8'}`,
          borderRadius: 12, padding: '16px 20px',
        }}>
          {emailError ? (
            <>
              <p style={{ margin: '0 0 8px', fontSize: 13.5, fontWeight: 600, color: '#9a4b0a' }}>
                ⚠ L'email n'a pas pu être envoyé — partagez ce lien manuellement :
              </p>
              <p style={{ margin: '0 0 6px', fontSize: 11, color: '#9a7050' }}>
                Raison : {emailError}
              </p>
            </>
          ) : (
            <p style={{ margin: '0 0 8px', fontSize: 13.5, fontWeight: 600, color: '#2f6b46' }}>
              ✓ Email envoyé. Lien d'invitation :
            </p>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              readOnly value={createdUrl}
              style={{ flex: 1, minWidth: 0, height: 34, padding: '0 10px', fontSize: 12.5, border: '1px solid #d0c8bb', borderRadius: 8, background: 'white', color: '#333', fontFamily: 'monospace' }}
              onFocus={e => e.target.select()}
            />
            <button
              type="button"
              onClick={() => { navigator.clipboard.writeText(createdUrl).catch(() => {}); setCopiedNew(true); setTimeout(() => setCopiedNew(false), 2000); }}
              style={{ height: 34, padding: '0 14px', background: copiedNew ? '#2f6b46' : '#1e3a2f', color: '#f1ede2', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              {copiedNew ? '✓ Copié !' : 'Copier'}
            </button>
          </div>
        </div>
      )}

      {/* Post-reset: show reset link */}
      {resetUrl && (
        <div style={{
          background: '#f0f4ff', border: '1px solid #a8b8d8', borderRadius: 12, padding: '16px 20px',
        }}>
          <p style={{ margin: '0 0 8px', fontSize: 13.5, fontWeight: 600, color: '#2a3a6b' }}>
            Lien de réinitialisation du mot de passe — à partager directement avec {dbUsers.find(u => u.id === resetUserId)?.name || 'l\'utilisateur'} :
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              readOnly value={resetUrl}
              style={{ flex: 1, minWidth: 0, height: 34, padding: '0 10px', fontSize: 12.5, border: '1px solid #d0c8bb', borderRadius: 8, background: 'white', color: '#333', fontFamily: 'monospace' }}
              onFocus={e => e.target.select()}
            />
            <button
              type="button"
              onClick={() => { navigator.clipboard.writeText(resetUrl).catch(() => {}); setCopiedReset(true); setTimeout(() => setCopiedReset(false), 2000); }}
              style={{ height: 34, padding: '0 14px', background: copiedReset ? '#2a3a6b' : '#3f617f', color: '#f1ede2', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              {copiedReset ? '✓ Copié !' : 'Copier'}
            </button>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 12, color: '#6070a0' }}>
            Valable 7 jours. L'utilisateur choisit son nouveau mot de passe en suivant ce lien.
          </p>
        </div>
      )}

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
                  padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-900)' }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 2 }}>
                      {u.email
                        ? <>{u.email} · </>
                        : <span style={{ color: '#b03a2e', fontWeight: 600 }}>Email manquant · </span>}
                      depuis le {formatDate(u.createdAt)}
                    </div>
                  </div>
                  <span style={{ ...rc, borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 500 }}>
                    {ROLE_LABELS[u.role]}
                  </span>
                  <button
                    onClick={() => handleResetUser(u)}
                    style={{
                      height: 32, padding: '0 12px', background: 'none',
                      border: '1px solid var(--line)', borderRadius: 8, fontSize: 12,
                      cursor: 'pointer', color: '#3f617f', fontFamily: 'var(--font-sans)',
                    }}
                  >
                    Réinitialiser l'accès
                  </button>
                  <button
                    onClick={() => startTransition(() => { handleDeleteUser(u.id); })}
                    onBlur={() => setConfirmRevoke(current => current === u.id ? '' : current)}
                    aria-label={confirmRevoke === u.id ? `Confirmer la révocation de ${u.name}` : `Révoquer l'accès de ${u.name}`}
                    style={{
                      height: 32, padding: '0 12px',
                      background: confirmRevoke === u.id ? '#b03a2e' : 'none',
                      border: `1px solid ${confirmRevoke === u.id ? '#b03a2e' : 'var(--line)'}`, borderRadius: 8, fontSize: 12,
                      cursor: 'pointer', color: confirmRevoke === u.id ? '#fffdf9' : '#b03a2e', fontFamily: 'var(--font-sans)',
                      fontWeight: confirmRevoke === u.id ? 600 : 400,
                    }}
                  >
                    {confirmRevoke === u.id ? 'Confirmer ?' : 'Révoquer'}
                  </button>
                  {userError?.id === u.id && (
                    <p role="alert" style={{ flexBasis: '100%', margin: 0, fontSize: 12.5, color: '#b03a2e' }}>{userError.message}</p>
                  )}
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
