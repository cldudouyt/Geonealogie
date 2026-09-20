export const SESSION_COOKIE = 'geo_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
export type Role = 'reader' | 'contributor' | 'admin';
export interface Session { name: string; role: Role; expires: number; credential: string }
export const ROLE_LABELS: Record<Role, string> = { reader: 'Lecteur', contributor: 'Contributeur', admin: 'Administrateur' };

async function signature(message: string): Promise<string> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('Connexion non configurée.');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))), b => b.toString(16).padStart(2, '0')).join('');
}
function equal(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0; for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
interface Account { name: string; role: Role; password: string }
function accounts(): Account[] {
  const configured: unknown = JSON.parse(process.env.AUTH_USERS_JSON || '[]');
  if (!Array.isArray(configured)) throw new Error('Configuration des accès invalide.');
  const result: Account[] = configured.filter((a): a is Account => a && typeof a.name === 'string' && typeof a.password === 'string' && a.password.length > 0 && ['reader','contributor','admin'].includes(a.role));
  if (process.env.AUTH_PASSWORD) result.push({ name: 'Administration familiale', role: 'admin', password: process.env.AUTH_PASSWORD });
  return result;
}
export async function authenticate(password: string): Promise<Account | null> {
  const digest = await signature(password);
  for (const account of accounts()) if (equal(digest, await signature(account.password))) return account;
  return null;
}
export async function makeSessionToken(account?: Account): Promise<string> {
  const selected = account ?? accounts().find(a => a.role === 'admin');
  if (!selected) throw new Error('Connexion non configurée.');
  const session: Session = { name: selected.name, role: selected.role, expires: Date.now() + SESSION_MAX_AGE * 1000, credential: await signature(selected.password) };
  const payload = encodeURIComponent(JSON.stringify(session));
  return `${payload}.${await signature(payload)}`;
}
export async function readSessionToken(token: string): Promise<Session | null> {
  try {
    const split = token.lastIndexOf('.');
    const payload = token.slice(0, split);
    if (split < 0 || !equal(await signature(payload), token.slice(split + 1))) return null;
    const session = JSON.parse(decodeURIComponent(payload)) as Session;
    if (!Number.isFinite(session.expires) || session.expires <= Date.now()) return null;
    for (const a of accounts()) if (a.name === session.name && a.role === session.role && equal(await signature(a.password), session.credential)) return session;
    return null;
  } catch { return null; }
}
export async function verifySessionToken(token: string): Promise<boolean> { return Boolean(await readSessionToken(token)); }
export function permits(role: Role, minimum: Role): boolean { return ['reader','contributor','admin'].indexOf(role) >= ['reader','contributor','admin'].indexOf(minimum); }
