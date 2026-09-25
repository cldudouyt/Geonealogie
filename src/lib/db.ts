import { neon } from '@neondatabase/serverless';

export function hasDb(): boolean {
  return Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);
}

function getSql() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  return neon(url);
}

let schemaReady: Promise<void> | null = null;

function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = getSql();
      await sql`
        CREATE TABLE IF NOT EXISTS kv_state (
          id TEXT PRIMARY KEY,
          data JSONB NOT NULL DEFAULT '{}',
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`ALTER TABLE kv_state ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 0`;
      await sql`
        CREATE TABLE IF NOT EXISTS suggestions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title TEXT NOT NULL,
          body TEXT NOT NULL,
          author TEXT NOT NULL DEFAULT 'Anonyme',
          status TEXT NOT NULL DEFAULT 'open',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'general'`;
      await sql`ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS person_id TEXT`;
      await sql`ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS field_name TEXT`;
      await sql`ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS suggested_value TEXT`;
    })().catch(err => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

export async function kvGet<T>(id: string): Promise<T | null> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`SELECT data FROM kv_state WHERE id = ${id}`;
  return rows.length > 0 ? (rows[0].data as T) : null;
}

export async function kvSet(id: string, data: unknown): Promise<void> {
  await ensureSchema();
  const sql = getSql();
  await sql`
    INSERT INTO kv_state (id, data, updated_at)
    VALUES (${id}, ${JSON.stringify(data)}::jsonb, now())
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()
  `;
}

export interface SuggestionRow {
  id: string;
  title: string;
  body: string;
  author: string;
  status: string;
  createdAt: string;
  type: string;
  personId: string | null;
  fieldName: string | null;
  suggestedValue: string | null;
}

export async function listSuggestions(): Promise<SuggestionRow[]> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT id, title, body, author, status, created_at, type, person_id, field_name, suggested_value
    FROM suggestions ORDER BY created_at DESC
  `;
  return rows.map(r => ({
    id: String(r.id),
    title: String(r.title),
    body: String(r.body),
    author: String(r.author),
    status: String(r.status),
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    type: r.type ? String(r.type) : 'general',
    personId: r.person_id ? String(r.person_id) : null,
    fieldName: r.field_name ? String(r.field_name) : null,
    suggestedValue: r.suggested_value ? String(r.suggested_value) : null,
  }));
}

export async function insertSuggestion(data: {
  title: string;
  body: string;
  author?: string;
  type?: string;
  personId?: string;
  fieldName?: string;
  suggestedValue?: string;
}): Promise<void> {
  await ensureSchema();
  const sql = getSql();
  await sql`
    INSERT INTO suggestions (title, body, author, type, person_id, field_name, suggested_value)
    VALUES (
      ${data.title},
      ${data.body},
      ${data.author || 'Anonyme'},
      ${data.type || 'general'},
      ${data.personId || null},
      ${data.fieldName || null},
      ${data.suggestedValue || null}
    )
  `;
}

export async function updateSuggestionStatus(id: string, status: string): Promise<void> {
  await ensureSchema();
  const sql = getSql();
  await sql`UPDATE suggestions SET status = ${status} WHERE id = ${id}::uuid`;
}

/* ── Invitations & DB users (stored in kv_state) ──────────────────────── */

export type InviteRole = 'reader' | 'contributor' | 'admin';

export interface InvitationRecord {
  token: string;
  role: InviteRole;
  email: string;
  suggestedName?: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
  usedBy?: string;
  resetForUserId?: string; // set for password-reset links (existing user)
}

export interface DbUser {
  id: string;
  name: string;
  email?: string;
  role: InviteRole;
  passwordHash: string;
  salt: string;
  createdAt: string;
  invitationToken?: string;
  personId?: string;
}

const INVITATIONS_KEY = 'invitations';
const DB_USERS_KEY = 'db-users';

export class StoreConflictError extends Error {}

async function kvMutate<T, R>(id: string, initial: () => T, mutate: (state: T) => R): Promise<R> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const row = await kvReadVersion<T>(id);
    const state = row?.data ?? initial();
    const result = mutate(state);
    if (await kvCompareSet(id, row?.version ?? null, state)) return result;
  }
  throw new StoreConflictError('Une autre modification est en cours. Réessayez dans un instant.');
}

type InvitationMap = Record<string, InvitationRecord>;

export async function listInvitations(): Promise<InvitationRecord[]> {
  const data = await kvGet<InvitationMap>(INVITATIONS_KEY);
  return Object.values(data ?? {});
}

export async function getInvitation(token: string): Promise<InvitationRecord | null> {
  const data = await kvGet<InvitationMap>(INVITATIONS_KEY);
  return data?.[token] ?? null;
}

export async function saveInvitation(inv: InvitationRecord): Promise<void> {
  await kvMutate<InvitationMap, void>(INVITATIONS_KEY, () => ({}), data => { data[inv.token] = inv; });
}

export async function deleteInvitation(token: string): Promise<void> {
  await kvMutate<InvitationMap, void>(INVITATIONS_KEY, () => ({}), data => { delete data[token]; });
}

export type ClaimResult = { ok: true; invitation: InvitationRecord } | { ok: false; reason: 'missing' | 'used' | 'expired' };

export async function claimInvitation(token: string, usedBy: string): Promise<ClaimResult> {
  return kvMutate<InvitationMap, ClaimResult>(INVITATIONS_KEY, () => ({}), data => {
    const inv = data[token];
    if (!inv) return { ok: false, reason: 'missing' };
    if (inv.usedAt) return { ok: false, reason: 'used' };
    if (new Date(inv.expiresAt) < new Date()) return { ok: false, reason: 'expired' };
    data[token] = { ...inv, usedAt: new Date().toISOString(), usedBy };
    return { ok: true, invitation: data[token] };
  });
}

export async function releaseInvitation(token: string): Promise<void> {
  await kvMutate<InvitationMap, void>(INVITATIONS_KEY, () => ({}), data => {
    const inv = data[token];
    if (inv) { delete inv.usedAt; delete inv.usedBy; }
  });
}

export async function listDbUsers(): Promise<DbUser[]> {
  return await kvGet<DbUser[]>(DB_USERS_KEY) ?? [];
}

export async function saveDbUser(user: DbUser): Promise<void> {
  await kvMutate<DbUser[], void>(DB_USERS_KEY, () => [], users => {
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) users[idx] = user; else users.push(user);
  });
}

export async function createDbUser(user: DbUser): Promise<boolean> {
  return kvMutate<DbUser[], boolean>(DB_USERS_KEY, () => [], users => {
    const email = user.email?.toLowerCase();
    if (users.some(u => u.id === user.id || (email && u.email?.toLowerCase() === email))) return false;
    users.push(user);
    return true;
  });
}

export type DeleteUserResult = 'ok' | 'missing' | 'self' | 'last-admin';

export async function deleteDbUser(id: string, actorId?: string): Promise<DeleteUserResult> {
  return kvMutate<DbUser[], DeleteUserResult>(DB_USERS_KEY, () => [], users => {
    const idx = users.findIndex(u => u.id === id);
    if (idx < 0) return 'missing';
    if (actorId && actorId === id) return 'self';
    if (users[idx].role === 'admin' && users.filter(u => u.role === 'admin').length <= 1) return 'last-admin';
    users.splice(idx, 1);
    return 'ok';
  });
}

export async function updateDbUserPersonId(userId: string, personId: string): Promise<boolean> {
  return kvMutate<DbUser[], boolean>(DB_USERS_KEY, () => [], users => {
    const idx = users.findIndex(u => u.id === userId);
    if (idx < 0) return false;
    users[idx] = { ...users[idx], personId };
    return true;
  });
}

export async function updateDbUserPasswordById(userId: string, passwordHash: string, salt: string): Promise<DbUser | null> {
  return kvMutate<DbUser[], DbUser | null>(DB_USERS_KEY, () => [], users => {
    const idx = users.findIndex(u => u.id === userId);
    if (idx < 0) return null;
    users[idx] = { ...users[idx], passwordHash, salt };
    return users[idx];
  });
}

export async function kvReadVersion<T>(id: string): Promise<{ data: T; version: number } | null> {
  await ensureSchema();
  const rows = await getSql()`SELECT data, version FROM kv_state WHERE id = ${id}`;
  return rows.length ? { data: rows[0].data as T, version: Number(rows[0].version) } : null;
}
export async function kvCompareSet(id: string, version: number | null, data: unknown): Promise<boolean> {
  await ensureSchema();
  const sql = getSql();
  const rows = version === null
    ? await sql`INSERT INTO kv_state (id, data, version) VALUES (${id}, ${JSON.stringify(data)}::jsonb, 1) ON CONFLICT (id) DO NOTHING RETURNING id`
    : await sql`UPDATE kv_state SET data = ${JSON.stringify(data)}::jsonb, version = version + 1, updated_at = now() WHERE id = ${id} AND version = ${version} RETURNING id`;
  return rows.length > 0;
}
