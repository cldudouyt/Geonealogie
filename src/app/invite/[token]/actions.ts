'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getInvitation, markInvitationUsed, saveDbUser } from '@/lib/db';
import { hashPassword, makeSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth';
import type { Role } from '@/lib/auth';

export interface ClaimState {
  error?: string;
}

export async function claimInvitation(
  _prev: ClaimState | null,
  formData: FormData,
): Promise<ClaimState> {
  const token = formData.get('token')?.toString() || '';
  const name = formData.get('name')?.toString().trim() || '';
  const password = formData.get('password')?.toString() || '';
  const confirm = formData.get('confirm')?.toString() || '';

  if (!name) return { error: 'Le prénom/nom est obligatoire.' };
  if (password.length < 8) return { error: 'Le mot de passe doit contenir au moins 8 caractères.' };
  if (password !== confirm) return { error: 'Les mots de passe ne correspondent pas.' };

  const inv = await getInvitation(token);
  if (!inv) return { error: 'Invitation introuvable.' };
  if (inv.usedAt) return { error: 'Cette invitation a déjà été utilisée.' };
  if (new Date(inv.expiresAt) < new Date()) return { error: 'Cette invitation a expiré.' };

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

  await markInvitationUsed(token, name);

  const token2 = await makeSessionToken({ name, role: inv.role as Role, id: userId });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token2, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });

  redirect('/');
}
