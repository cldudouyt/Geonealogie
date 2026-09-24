import { getInvitation } from '@/lib/db';
import InviteForm from './InviteForm';

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const inv = await getInvitation(token).catch(() => null);
  const isReset = Boolean(inv?.resetForUserId);
  return <InviteForm token={token} isReset={isReset} />;
}
