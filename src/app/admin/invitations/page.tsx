import { requireRole } from '@/lib/session';
import { hasDb, listInvitations, listDbUsers } from '@/lib/db';
import InvitationsClient from './InvitationsClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Invitations — Géonéalogie' };

export default async function InvitationsPage() {
  await requireRole('admin');

  let invitations: import('@/lib/db').InvitationRecord[] = [];
  let dbUsers: import('@/lib/db').DbUser[] = [];
  if (hasDb()) {
    try {
      [invitations, dbUsers] = await Promise.all([listInvitations(), listDbUsers()]);
    } catch { /* ignore DB errors */ }
  }

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '32px 20px' }}>
      <h1 style={{
        fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 500,
        color: 'var(--ink-900)', margin: '0 0 6px', letterSpacing: '-0.02em',
      }}>
        Invitations
      </h1>
      <p style={{ fontSize: 13.5, color: 'var(--ink-500)', margin: '0 0 28px' }}>
        Invitez des proches et gérez les accès à l'espace familial.
      </p>

      <InvitationsClient
        initialInvitations={invitations}
        initialDbUsers={dbUsers}
        baseUrl={baseUrl}
      />

      {!hasDb() && (
        <div style={{
          background: '#fef3cd', border: '1px solid #fcd34d', borderRadius: 12,
          padding: '14px 16px', fontSize: 13.5, color: '#92400e', marginTop: 20,
        }}>
          Base de données non configurée — les invitations ne seront pas persistées.
          Ajoutez <code>DATABASE_URL</code> dans les variables Vercel.
        </div>
      )}
    </main>
  );
}
