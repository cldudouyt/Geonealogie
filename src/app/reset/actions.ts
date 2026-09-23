'use server';

import { hasDb, listDbUsers, saveResetToken } from '@/lib/db';
import { sendEmail, appBaseUrl } from '@/lib/email';

export type ResetRequestState = { ok?: boolean; error?: string } | null;

export async function requestReset(
  _prev: ResetRequestState,
  formData: FormData,
): Promise<ResetRequestState> {
  const email = formData.get('email')?.toString().trim() || '';
  if (!email) return { error: 'Email requis.' };
  if (!process.env.RESEND_API_KEY) {
    return { error: 'La réinitialisation par email n\'est pas activée. Contactez l\'administrateur.' };
  }

  try {
    if (hasDb()) {
      const users = await listDbUsers();
      const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (user) {
        const token = crypto.randomUUID();
        await saveResetToken({
          token,
          email,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        });
        const resetUrl = `${appBaseUrl()}/reset/${token}`;
        await sendEmail(
          email,
          'Réinitialisation de votre mot de passe — Géonéalogie',
          `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 20px">
            <h1 style="font-size:24px;color:#1c1f1c;margin:0 0 12px">Réinitialisation du mot de passe</h1>
            <p style="color:#4a4f46;line-height:1.6;margin:0 0 20px">
              Vous avez demandé la réinitialisation de votre mot de passe Géonéalogie.<br>
              Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.
            </p>
            <a href="${resetUrl}" style="display:inline-block;background:#1e3a2f;color:#f1ede2;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px">
              Réinitialiser mon mot de passe
            </a>
            <p style="color:#9a9080;font-size:12px;margin:20px 0 0">
              Ce lien est valable 1 heure.<br>
              Si vous n'avez pas demandé cette réinitialisation, ignorez ce message.
            </p>
          </div>`,
        );
      }
    }
  } catch { /* non-blocking */ }

  // Always return success — don't reveal if the email exists
  return { ok: true };
}
