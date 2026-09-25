'use server';

import { getInvitation, claimInvitation, releaseInvitation, createDbUser, listDbUsers, updateDbUserPasswordById, type DbUser } from '@/lib/db';
import { hashPassword, makeSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const CLAIM_ERRORS = {
  missing: 'Lien invalide ou expiré. Demandez un nouveau lien à l\'administrateur.',
  used: 'Ce lien a déjà été utilisé. Connectez-vous directement.',
  expired: 'Lien expiré (7 jours). Demandez un nouveau lien.',
} as const;

export async function activateInvitation(formData: FormData): Promise<{ error: string } | undefined> {
  const token = formData.get('token')?.toString() || '';
  const name = formData.get('name')?.toString().trim() || '';
  const password = formData.get('password')?.toString() || '';
  const confirm = formData.get('confirm')?.toString() || '';

  if (password.length < 8) return { error: 'Le mot de passe doit contenir au moins 8 caractères.' };
  if (password !== confirm) return { error: 'Les mots de passe ne correspondent pas.' };

  const inv = await getInvitation(token).catch(() => null);
  if (!inv) return { error: CLAIM_ERRORS.missing };
  if (inv.usedAt) return { error: CLAIM_ERRORS.used };
  if (new Date(inv.expiresAt) < new Date()) return { error: CLAIM_ERRORS.expired };

  let target: DbUser | undefined;
  if (inv.resetForUserId) {
    target = (await listDbUsers().catch(() => [])).find(u => u.id === inv.resetForUserId);
    if (!target) return { error: 'Ce compte n’existe plus. Contactez l\'administrateur.' };
  } else if (!name) {
    return { error: 'Prénom requis.' };
  }

  const salt = crypto.randomUUID();
  const passwordHash = await hashPassword(password, salt);

  let claim;
  try { claim = await claimInvitation(token, target?.name ?? name); }
  catch { return { error: 'Activation momentanément indisponible. Réessayez dans un instant.' }; }
  if (!claim.ok) return { error: CLAIM_ERRORS[claim.reason] };

  let user: DbUser;
  try {
    if (inv.resetForUserId) {
      const updated = await updateDbUserPasswordById(inv.resetForUserId, passwordHash, salt);
      if (!updated) return { error: 'Ce compte n’existe plus. Contactez l\'administrateur.' };
      user = updated;
    } else {
      user = {
        id: crypto.randomUUID(),
        name,
        email: claim.invitation.email,
        role: claim.invitation.role,
        passwordHash,
        salt,
        createdAt: new Date().toISOString(),
        invitationToken: token,
      };
      if (!await createDbUser(user)) return { error: 'Ce compte existe déjà. Connectez-vous directement.' };
    }
  } catch {
    await releaseInvitation(token).catch(() => {});
    return { error: 'Activation momentanément indisponible. Réessayez dans un instant.' };
  }

  const sessionToken = await makeSessionToken({ name: user.name, role: user.role, id: user.id, passwordHash: user.passwordHash });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });

  redirect('/');
}
