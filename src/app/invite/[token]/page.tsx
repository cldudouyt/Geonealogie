import { getInvitation } from '@/lib/db';
import InviteForm from './InviteForm';

const ROLE_LABELS: Record<string, string> = {
  reader: 'Lecteur',
  contributor: 'Contributeur',
  admin: 'Administrateur',
};

export default async function InvitePage({ params }: { params: { token: string } }) {
  const inv = await getInvitation(params.token).catch(() => null);

  if (!inv) {
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
          <div style={{
            width: 52, height: 52, borderRadius: 15,
            background: '#fae6e3', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 20px',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#b03a2e" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>
            </svg>
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 500, color: 'var(--ink-900)', margin: '0 0 10px' }}>
            Invitation invalide
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--ink-600)', margin: '0 0 24px', lineHeight: 1.55 }}>
            Ce lien n'existe pas, a déjà été utilisé ou a expiré.
          </p>
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

  if (inv.usedAt) {
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
          <p style={{ fontSize: 14, color: 'var(--ink-600)', margin: '0 0 20px' }}>
            Cette invitation a déjà été utilisée. Si vous avez déjà un compte, connectez-vous normalement.
          </p>
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

  const isExpired = new Date(inv.expiresAt) < new Date();

  return (
    <InviteForm
      token={params.token}
      role={inv.role}
      roleLabel={ROLE_LABELS[inv.role] ?? inv.role}
      suggestedName={inv.suggestedName}
      createdBy={inv.createdBy}
      isExpired={isExpired}
    />
  );
}
