import { getInvitation, saveDbUser, markInvitationUsed } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import type { Role } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

function ErrorCard({ title, body }: { title: string; body: string }) {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'linear-gradient(155deg, #1e3a2f 0%, #15271f 60%, #0f1d16 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}>
      <div style={{
        background: 'var(--paper-card)', borderRadius: 22, padding: '38px 34px',
        maxWidth: 400, width: '100%', textAlign: 'center',
        boxShadow: '0 30px 80px -30px rgba(0,0,0,.6)',
      }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 500, color: 'var(--ink-900)', margin: '0 0 10px' }}>
          {title}
        </h1>
        <p style={{ fontSize: 13.5, color: 'var(--ink-600)', margin: '0 0 24px', lineHeight: 1.55 }}>{body}</p>
        <a href="/login" style={{
          display: 'inline-block', background: 'var(--green-700)', color: '#f1ede2',
          padding: '10px 24px', borderRadius: 10, textDecoration: 'none',
          fontSize: 14, fontWeight: 600,
        }}>
          Se connecter
        </a>
      </div>
    </div>
  );
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const inv = await getInvitation(token).catch(() => null);

  if (!inv) return <ErrorCard title="Invitation invalide" body="Ce lien n'existe pas ou a expiré." />;
  if (inv.usedAt) return <ErrorCard title="Déjà utilisée" body="Ce lien a déjà été utilisé. Connectez-vous ou utilisez « Mot de passe oublié »." />;
  if (new Date(inv.expiresAt) < new Date()) return <ErrorCard title="Invitation expirée" body="Ce lien a expiré. Demandez un nouveau lien à l'administrateur." />;

  // Auto-create the account — name from suggestedName or email prefix
  const name = inv.suggestedName || inv.email.split('@')[0];
  const userId = crypto.randomUUID();
  const salt = crypto.randomUUID();
  const passwordHash = await hashPassword(crypto.randomUUID(), salt);

  await saveDbUser({
    id: userId,
    name,
    email: inv.email,
    role: inv.role as Role,
    passwordHash,
    salt,
    createdAt: new Date().toISOString(),
    invitationToken: token,
  });
  await markInvitationUsed(token, name);

  // Redirect directly to reset page with email pre-filled
  redirect(`/reset?email=${encodeURIComponent(inv.email)}`);
}
