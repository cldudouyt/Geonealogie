'use server';

import { redirect } from 'next/navigation';
import { getInvitation, markInvitationUsed, saveDbUser } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
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

  if (!name) return { error: 'Le prénom/nom est obligatoire.' };

  const inv = await getInvitation(token);
  if (!inv) return { error: 'Invitation introuvable.' };
  if (inv.usedAt) return { error: 'Cette invitation a déjà été utilisée.' };
  if (new Date(inv.expiresAt) < new Date()) return { error: 'Cette invitation a expiré.' };

  // Create account with a random placeholder password (user will set their own via OTP reset)
  const userId = crypto.randomUUID();
  const salt = crypto.randomUUID();
  const passwordHash = await hashPassword(crypto.randomUUID(), salt);

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

  // Redirect to login with welcome flag so the user knows to set their password
  redirect('/login?welcome=1');
}
