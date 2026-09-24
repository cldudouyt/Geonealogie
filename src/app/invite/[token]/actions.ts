'use server';

import { getInvitation, saveDbUser, deleteInvitation, listDbUsers } from '@/lib/db';
import { hashPassword, makeSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth';
import type { Role } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function activateInvitation(formData: FormData): Promise<{ error: string } | undefined> {
  const token = formData.get('token')?.toString() || '';
  const name = formData.get('name')?.toString().trim() || '';
  const password = formData.get('password')?.toString() || '';
  const confirm = formData.get('confirm')?.toString() || '';

  if (!name) return { error: 'Prénom requis.' };
  if (password.length < 8) return { error: 'Le mot de passe doit contenir au moins 8 caractères.' };
  if (password !== confirm) return { error: 'Les mots de passe ne correspondent pas.' };

  const inv = await getInvitation(token).catch(() => null);
  if (!inv) return { error: 'Lien invalide ou expiré. Demandez un nouveau lien à l\'administrateur.' };
  if (inv.usedAt) return { error: 'Ce lien a déjà été utilisé. Connectez-vous directement.' };
  if (new Date(inv.expiresAt) < new Date()) return { error: 'Lien expiré (7 jours). Demandez un nouveau lien.' };

  // Check email not already registered
  const existing = await listDbUsers().catch(() => []);
  if (existing.find(u => u.email?.toLowerCase() === inv.email.toLowerCase())) {
    return { error: 'Ce compte existe déjà. Connectez-vous directement.' };
  }

  const userId = crypto.randomUUID();
  const salt = crypto.randomUUID();
  const passwordHash = await hashPassword(password, salt);

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

  await deleteInvitation(token);

  const sessionToken = await makeSessionToken({ name, role: inv.role as Role, id: userId });
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
