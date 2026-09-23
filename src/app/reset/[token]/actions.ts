'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getResetToken, markResetTokenUsed, updateDbUserPassword, listDbUsers } from '@/lib/db';
import { hashPassword, makeSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth';

export interface ApplyResetState {
  error?: string;
}

export async function applyReset(
  _prev: ApplyResetState | null,
  formData: FormData,
): Promise<ApplyResetState> {
  const token = formData.get('token')?.toString() || '';
  const password = formData.get('password')?.toString() || '';
  const confirm = formData.get('confirm')?.toString() || '';

  if (password.length < 8) return { error: 'Le mot de passe doit contenir au moins 8 caractères.' };
  if (password !== confirm) return { error: 'Les mots de passe ne correspondent pas.' };

  const rt = await getResetToken(token);
  if (!rt) return { error: 'Lien de réinitialisation invalide.' };
  if (rt.usedAt) return { error: 'Ce lien a déjà été utilisé.' };
  if (new Date(rt.expiresAt) < new Date()) return { error: 'Ce lien a expiré. Demandez un nouveau lien.' };

  const salt = crypto.randomUUID();
  const passwordHash = await hashPassword(password, salt);
  const updated = await updateDbUserPassword(rt.email, passwordHash, salt);
  if (!updated) return { error: 'Compte introuvable. Contactez l\'administrateur.' };

  await markResetTokenUsed(token);

  // Auto-login
  const users = await listDbUsers();
  const user = users.find(u => u.email?.toLowerCase() === rt.email.toLowerCase());
  if (user) {
    const sessionToken = await makeSessionToken({ name: user.name, role: user.role, id: user.id });
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    });
  }

  redirect('/');
}
