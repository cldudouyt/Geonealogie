'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { makeSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth';

export async function login(
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string }> {
  const password = formData.get('password')?.toString() || '';

  if (!process.env.AUTH_PASSWORD) {
    return { error: 'AUTH_PASSWORD non configuré dans .env.local' };
  }

  if (password !== process.env.AUTH_PASSWORD) {
    return { error: 'Mot de passe incorrect' };
  }

  const token = await makeSessionToken();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });

  redirect('/');
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect('/login');
}
