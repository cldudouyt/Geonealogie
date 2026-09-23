'use server';

import { hasDb, listDbUsers, saveResetToken, getResetToken, markResetTokenUsed, updateDbUserPassword } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { hashPassword, makeSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export type RequestState = { token?: string; error?: string } | null;
export type ApplyState = { error?: string } | null;

export async function requestReset(_prev: RequestState, formData: FormData): Promise<RequestState> {
  const email = formData.get('email')?.toString().trim() || '';
  if (!email) return { error: 'Email requis.' };
  if (!process.env.RESEND_API_KEY) {
    return { error: 'La réinitialisation par email n\'est pas activée. Contactez l\'administrateur.' };
  }

  // Always return a token (even if email not found) to not reveal existence
  const token = crypto.randomUUID();
  const otp = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');

  try {
    if (hasDb()) {
      const users = await listDbUsers();
      const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (user) {
        await saveResetToken({
          token,
          email,
          otp,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min
        });
        await sendEmail(
          email,
          'Votre code de vérification — Géonéalogie',
          `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 20px">
            <h1 style="font-size:22px;color:#1c1f1c;margin:0 0 12px">Réinitialisation du mot de passe</h1>
            <p style="color:#4a4f46;line-height:1.6;margin:0 0 24px">
              Voici votre code de vérification. Il est valable 15 minutes.
            </p>
            <div style="background:#f4f1ea;border-radius:12px;padding:20px 24px;text-align:center;margin:0 0 24px">
              <span style="font-size:38px;font-weight:700;letter-spacing:10px;color:#1e3a2f;font-family:monospace">${otp}</span>
            </div>
            <p style="color:#9a9080;font-size:12px;margin:0">
              Si vous n'avez pas demandé cette réinitialisation, ignorez ce message.
            </p>
          </div>`,
        );
      }
    }
  } catch { /* non-blocking */ }

  return { token };
}

export async function applyReset(_prev: ApplyState, formData: FormData): Promise<ApplyState> {
  const token = formData.get('token')?.toString() || '';
  const otp = formData.get('otp')?.toString().trim() || '';
  const password = formData.get('password')?.toString() || '';
  const confirm = formData.get('confirm')?.toString() || '';

  if (!otp) return { error: 'Code requis.' };
  if (password.length < 8) return { error: 'Le mot de passe doit contenir au moins 8 caractères.' };
  if (password !== confirm) return { error: 'Les mots de passe ne correspondent pas.' };

  const rt = await getResetToken(token).catch(() => null);
  if (!rt) return { error: 'Session expirée. Recommencez.' };
  if (rt.usedAt) return { error: 'Ce code a déjà été utilisé.' };
  if (new Date(rt.expiresAt) < new Date()) return { error: 'Code expiré (15 min). Recommencez.' };
  if (rt.otp !== otp) return { error: 'Code incorrect.' };

  const salt = crypto.randomUUID();
  const passwordHash = await hashPassword(password, salt);
  const updated = await updateDbUserPassword(rt.email, passwordHash, salt);
  if (!updated) return { error: 'Compte introuvable. Contactez l\'administrateur.' };

  await markResetTokenUsed(token);

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
