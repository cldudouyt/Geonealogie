export const SESSION_COOKIE = 'geo_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
export type Role = 'reader' | 'contributor' | 'admin';
export interface Session { name: string; role: Role; expires: number; credential: string; id?: string }
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

export function isValidEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

interface EnvAccount { name: string; role: Role; password: string; email: string }
const warned = new Set<string>();
function warnOnce(message: string) {
  if (warned.has(message)) return;
  warned.add(message);
  console.error(`[auth] ${message}`);
}
function envAccounts(): EnvAccount[] {
  const configured: unknown = JSON.parse(process.env.AUTH_USERS_JSON || '[]');
  if (!Array.isArray(configured)) throw new Error('Configuration des accès invalide.');
  const result: EnvAccount[] = [];
  for (const a of configured as Partial<EnvAccount>[]) {
    if (!a || typeof a.name !== 'string' || typeof a.password !== 'string' || !a.password || !['reader','contributor','admin'].includes(a.role as string)) continue;
    if (!isValidEmail(a.email)) { warnOnce(`AUTH_USERS_JSON : l'accès « ${a.name} » est ignoré, email obligatoire.`); continue; }
    result.push({ name: a.name, role: a.role as Role, password: a.password, email: a.email.trim() });
  }
  if (process.env.AUTH_PASSWORD) {
    const email = process.env.AUTH_ADMIN_EMAIL;
    if (isValidEmail(email)) {
      result.push({ name: 'Clément DUDOUYT', role: 'admin', password: process.env.AUTH_PASSWORD, email: email.trim() });
    } else {
      warnOnce('AUTH_ADMIN_EMAIL manquant ou invalide : le compte administrateur AUTH_PASSWORD est désactivé.');
    }
  }
  return result;
}

export interface AuthAccount { name: string; role: Role; id?: string }

export async function authenticate(password: string, email: string): Promise<AuthAccount | null> {
  const lEmail = email.toLowerCase();
  // Check env accounts with matching email
  const digest = await signature(password);
  for (const account of envAccounts()) {
    if (account.email.toLowerCase() === lEmail &&equal(digest, await signature(account.password))) {
      return { name: account.name, role: account.role };
    }
  }
  // Check DB accounts
  try {
    const { hasDb, listDbUsers } = await import('./db');
    if (hasDb()) {
      const dbUsers = await listDbUsers();
      const user = dbUsers.find(u => u.email?.toLowerCase() === lEmail);
      if (user && await verifyPassword(password, user.passwordHash, user.salt)) {
        return { name: user.name, role: user.role, id: user.id };
      }
    }
  } catch { /* ignore DB errors during auth */ }
  return null;
}

export async function makeSessionToken(account: AuthAccount): Promise<string> {
  // Credential anchor: for env accounts use HMAC(password); for DB accounts use HMAC(userId)
  const credentialSource = account.id ?? envAccounts().find(a => a.name === account.name)?.password;
  if (!credentialSource) throw new Error('Connexion non configurée.');
  const session: Session = { name: account.name, role: account.role, expires: Date.now() + SESSION_MAX_AGE * 1000, credential: await signature(credentialSource), ...(account.id ? { id: account.id } : {}) };
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
