import { getResetToken } from '@/lib/db';
import ResetForm from './ResetForm';

export const dynamic = 'force-dynamic';

export default async function ResetTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const rt = await getResetToken(token).catch(() => null);

  const isInvalid = !rt;
  const isUsed = Boolean(rt?.usedAt);
  const isExpired = rt ? new Date(rt.expiresAt) < new Date() : false;

  if (isInvalid || isUsed || isExpired) {
    const message = isUsed
      ? 'Ce lien a déjà été utilisé.'
      : isExpired
      ? 'Ce lien a expiré.'
      : 'Lien de réinitialisation invalide.';
    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: 'linear-gradient(155deg, #1e3a2f 0%, #15271f 60%, #0f1d16 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
      }}>
        <div style={{
          background: '#fffdf9', borderRadius: 22, padding: '40px 34px',
          maxWidth: 380, width: '100%', textAlign: 'center',
          boxShadow: '0 30px 80px -30px rgba(0,0,0,.6)',
        }}>
          <p style={{ fontSize: 15, color: '#4a4f46', marginBottom: 20 }}>{message}</p>
          <a href="/reset" style={{
            display: 'inline-block', background: '#1e3a2f', color: '#f1ede2',
            padding: '10px 24px', borderRadius: 10, textDecoration: 'none',
            fontSize: 14, fontWeight: 600,
          }}>
            Demander un nouveau lien
          </a>
        </div>
      </div>
    );
  }

  return <ResetForm token={token} />;
}
