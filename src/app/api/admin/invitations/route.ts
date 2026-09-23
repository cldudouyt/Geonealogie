import { requireRole, getSession } from '@/lib/session';
import { listInvitations, saveInvitation, deleteInvitation, type InviteRole } from '@/lib/db';
import { hasDb } from '@/lib/db';
import { sendEmail, appBaseUrl } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function GET() {
  await requireRole('admin');
  if (!hasDb()) return Response.json({ invitations: [] });
  const invitations = await listInvitations();
  return Response.json({ invitations });
}

export async function POST(req: Request) {
  await requireRole('admin');
  const session = await getSession();
  if (!session) return Response.json({ error: 'Non autorisé' }, { status: 401 });

  const { email, role, suggestedName } = await req.json() as { email: string; role: InviteRole; suggestedName?: string };
  if (!email || !role) return Response.json({ error: 'Email et rôle requis' }, { status: 400 });
  if (!['reader', 'contributor', 'admin'].includes(role)) return Response.json({ error: 'Rôle invalide' }, { status: 400 });

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  const inv = {
    token,
    role,
    email,
    suggestedName,
    createdBy: session.name,
    createdAt: new Date().toISOString(),
    expiresAt,
  };

  await saveInvitation(inv);

  const baseUrl = appBaseUrl();
  const inviteUrl = `${baseUrl}/invite/${token}`;

  const roleLabels: Record<InviteRole, string> = { reader: 'Lecteur', contributor: 'Contributeur', admin: 'Administrateur' };
  await sendEmail(
    email,
    `${session.name} vous invite à rejoindre Géonéalogie`,
    `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 20px">
      <h1 style="font-size:24px;color:#1c1f1c;margin:0 0 12px">Invitation à Géonéalogie</h1>
      <p style="color:#4a4f46;line-height:1.6;margin:0 0 20px">
        <strong>${session.name}</strong> vous invite à rejoindre l'espace familial Géonéalogie
        en tant que <strong>${roleLabels[role]}</strong>.
      </p>
      <p style="color:#4a4f46;line-height:1.6;margin:0 0 20px">
        Vous vous connecterez avec cette adresse email : <strong>${email}</strong>
      </p>
      <a href="${inviteUrl}" style="display:inline-block;background:#1e3a2f;color:#f1ede2;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px">
        Accepter l'invitation
      </a>
      <p style="color:#9a9080;font-size:12px;margin:20px 0 0">
        Ce lien est valable 7 jours et ne peut être utilisé qu'une seule fois.<br>
        Si vous n'attendiez pas cette invitation, ignorez ce message.
      </p>
    </div>`,
  );

  return Response.json({ token, inviteUrl });
}

export async function DELETE(req: Request) {
  await requireRole('admin');
  const { token } = await req.json() as { token: string };
  if (!token) return Response.json({ error: 'Token requis' }, { status: 400 });
  await deleteInvitation(token);
  return Response.json({ ok: true });
}
