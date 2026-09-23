'use server';

import { consumeLimit, resetLimit, limitKey } from '@/lib/request-limits';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { authenticate, makeSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth';

export async function login(
  _prevState: { error?: string; success?: string } | null,
  formData: FormData,
): Promise<{ error?: string; success?: string }> {
  const password = formData.get('password')?.toString() || '';
  const email = formData.get('email')?.toString().trim() || '';
  if (!email) return { error: 'Email requis.' };

  if (password.length > 1024) return { error: 'Mot de passe trop long.' };
  let account;
  let key: string;
  try {
    const requestHeaders = await headers();
    const address = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    key = limitKey('login', address);
    if (!await consumeLimit(key, 5, 15 * 60_000)) return { error: 'Trop de tentatives. Réessayez dans 15 minutes.' };
    account = await authenticate(password, email);
    if (account) await resetLimit(key);
  } catch { return { error: 'Connexion momentanément indisponible. Réessayez plus tard.' }; }
  if (!account) return { error: 'Email ou mot de passe incorrect.' };
  const token = await makeSessionToken(account);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
  return { success: crypto.randomUUID() };
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect('/login');
}
