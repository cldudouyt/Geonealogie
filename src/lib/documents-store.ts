import fs from 'fs';
import path from 'path';
import { hasDb, kvGet, kvSet } from './db';

export interface DocumentMeta {
  id: string;
  personId: string;
  url: string;         // public URL (blob CDN or /documents/personId/filename)
  originalName: string;
  title?: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

const META_FILE = path.join(process.cwd(), 'data', 'documents.json');
const DOCS_DIR  = path.join(process.cwd(), 'public', 'documents');
const DB_KEY = 'documents';

// ─── Storage detection ─────────────────────────────────────────────────────

function shouldUseBlob(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

// ─── File storage ──────────────────────────────────────────────────────────

export async function uploadToStorage(
  personId: string,
  filename: string,
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  if (shouldUseBlob()) {
    const { put } = await import('@vercel/blob');
    const blob = await put(`documents/${personId}/${filename}`, buffer, {
      access: 'public',
      contentType: mimeType,
    });
    return blob.url;
  }

  // Local filesystem
  const dir = path.join(DOCS_DIR, personId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), buffer);
  return `/documents/${personId}/${filename}`;
}

export async function deleteFromStorage(url: string, personId: string): Promise<void> {
  if (shouldUseBlob()) {
    try {
      const { del } = await import('@vercel/blob');
      await del(url);
    } catch {
      // Not critical if already gone
    }
    return;
  }

  // Local filesystem: derive filename from URL
  const filename = url.split('/').pop();
  if (filename) {
    try {
      fs.unlinkSync(path.join(DOCS_DIR, personId, filename));
    } catch {
      // Not critical if already gone
    }
  }
}

// ─── Metadata storage ──────────────────────────────────────────────────────

function readAllFromFile(): Record<string, DocumentMeta[]> {
  try {
    return JSON.parse(fs.readFileSync(META_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function writeAllToFile(all: Record<string, DocumentMeta[]>): void {
  fs.mkdirSync(path.dirname(META_FILE), { recursive: true });
  fs.writeFileSync(META_FILE, JSON.stringify(all, null, 2), 'utf-8');
}

async function readAll(): Promise<Record<string, DocumentMeta[]>> {
  if (hasDb()) {
    try {
      return (await kvGet<Record<string, DocumentMeta[]>>(DB_KEY)) ?? {};
    } catch (err) {
      console.error('[documents] DB read failed, falling back to file:', err);
    }
  }
  return readAllFromFile();
}

async function writeAll(all: Record<string, DocumentMeta[]>): Promise<void> {
  if (hasDb()) {
    try {
      await kvSet(DB_KEY, all);
      return;
    } catch (err) {
      console.error('[documents] DB write failed, falling back to file:', err);
    }
  }
  writeAllToFile(all);
}

// ─── Public API ────────────────────────────────────────────────────────────

export async function getDocumentsForPerson(personId: string): Promise<DocumentMeta[]> {
  const all = await readAll();
  return all[personId] ?? [];
}

export async function saveDocumentMeta(doc: DocumentMeta): Promise<void> {
  const all = await readAll();
  if (!all[doc.personId]) all[doc.personId] = [];
  all[doc.personId].push(doc);
  await writeAll(all);
}

export async function deleteDocumentMeta(
  personId: string,
  docId: string,
): Promise<DocumentMeta | null> {
  const all = await readAll();
  const docs = all[personId] ?? [];
  const doc = docs.find(d => d.id === docId);
  if (!doc) return null;
  all[personId] = docs.filter(d => d.id !== docId);
  await writeAll(all);
  return doc;
}
