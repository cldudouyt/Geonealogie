'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { authenticate, makeSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth';

export async function login(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const password = formData.get('password')?.toString() || '';

  const account = await authenticate(password);
  if (!account) return { error: 'Mot de passe incorrect ou accès non configuré.' };
  const token = await makeSessionToken(account);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });

  return { success: true };
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect('/login');
}
