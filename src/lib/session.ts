import { cookies } from 'next/headers';
import { readSessionToken, SESSION_COOKIE, permits, type Role } from './auth';
export async function getSession() { return readSessionToken((await cookies()).get(SESSION_COOKIE)?.value || ''); }
export async function requireRole(minimum: Role = 'reader') {
  const session = await getSession();
  if (!session || !permits(session.role, minimum)) throw new Error('Vous ne disposez pas des droits nécessaires.');
  return session;
}
