import { getInvitation } from '@/lib/db';
import InviteForm from './InviteForm';

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}${'•'.repeat(Math.max(2, local.length - 2))}@${domain}`;
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const inv = await getInvitation(token).catch(() => null);
  const isReset = Boolean(inv?.resetForUserId);
  const maskedEmail = inv?.email ? maskEmail(inv.email) : undefined;
  return <InviteForm token={token} isReset={isReset} maskedEmail={maskedEmail} />;
}
