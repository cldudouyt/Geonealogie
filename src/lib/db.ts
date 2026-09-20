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
}

export async function listSuggestions(): Promise<SuggestionRow[]> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT id, title, body, author, status, created_at
    FROM suggestions ORDER BY created_at DESC
  `;
  return rows.map(r => ({
    id: String(r.id),
    title: String(r.title),
    body: String(r.body),
    author: String(r.author),
    status: String(r.status),
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  }));
}

export async function insertSuggestion(data: {
  title: string;
  body: string;
  author?: string;
}): Promise<void> {
  await ensureSchema();
  const sql = getSql();
  await sql`
    INSERT INTO suggestions (title, body, author)
    VALUES (${data.title}, ${data.body}, ${data.author || 'Anonyme'})
  `;
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
