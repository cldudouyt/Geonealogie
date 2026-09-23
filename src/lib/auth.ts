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

export async function hashPassword(password: string, salt: string): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 200000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return Buffer.from(bits).toString('hex');
}

export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  return equal(await hashPassword(password, salt), hash);
}

interface EnvAccount { name: string; role: Role; password: string }
function envAccounts(): EnvAccount[] {
  const configured: unknown = JSON.parse(process.env.AUTH_USERS_JSON || '[]');
  if (!Array.isArray(configured)) throw new Error('Configuration des accès invalide.');
  const result: EnvAccount[] = configured.filter((a): a is EnvAccount => a && typeof a.name === 'string' && typeof a.password === 'string' && a.password.length > 0 && ['reader','contributor','admin'].includes(a.role));
  if (process.env.AUTH_PASSWORD) result.push({ name: 'Administration familiale', role: 'admin', password: process.env.AUTH_PASSWORD });
  return result;
}

export interface AuthAccount { name: string; role: Role; id?: string }

export async function authenticate(password: string, name?: string): Promise<AuthAccount | null> {
  const digest = await signature(password);
  const allEnv = envAccounts();
  // If name provided, try name-filtered accounts first, then fall back to all
  const envCandidates = name
    ? allEnv.filter(a => a.name.toLowerCase().includes(name.toLowerCase()))
    : allEnv;
  for (const account of envCandidates) {
    if (equal(digest, await signature(account.password))) return { name: account.name, role: account.role };
  }
  // Check DB accounts
  try {
    const { hasDb, listDbUsers } = await import('./db');
    if (hasDb()) {
      const dbUsers = await listDbUsers();
      const dbCandidates = name
        ? dbUsers.filter(u => u.name.toLowerCase().includes(name.toLowerCase()))
        : dbUsers;
      for (const u of dbCandidates) {
        if (await verifyPassword(password, u.passwordHash, u.salt)) {
          return { name: u.name, role: u.role, id: u.id };
        }
      }
    }
  } catch { /* ignore DB errors during auth */ }
  // If name was provided but no match found, retry without name filter as fallback
  if (name) return authenticate(password);
  return null;
}

export async function makeSessionToken(account: AuthAccount): Promise<string> {
  // Credential anchor: for env accounts use HMAC(password); for DB accounts use HMAC(userId)
  const credentialSource = account.id ?? envAccounts().find(a => a.name === account.name)?.password;
  if (!credentialSource) throw new Error('Connexion non configurée.');
  const session: Session = { name: account.name, role: account.role, expires: Date.now() + SESSION_MAX_AGE * 1000, credential: await signature(credentialSource) };
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
    // Check env accounts
    for (const a of envAccounts()) {
      if (a.name === session.name && a.role === session.role && equal(await signature(a.password), session.credential)) return session;
    }
    // Check DB accounts
    try {
      const { hasDb, listDbUsers } = await import('./db');
      if (hasDb()) {
        const dbUsers = await listDbUsers();
        for (const u of dbUsers) {
          if (u.name === session.name && u.role === session.role && equal(await signature(u.id), session.credential)) return session;
        }
      }
    } catch { /* ignore DB errors */ }
    return null;
  } catch { return null; }
}
export async function verifySessionToken(token: string): Promise<boolean> { return Boolean(await readSessionToken(token)); }
export function permits(role: Role, minimum: Role): boolean { return ['reader','contributor','admin'].indexOf(role) >= ['reader','contributor','admin'].indexOf(minimum); }
