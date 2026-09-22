import fs from 'fs';
import path from 'path';
import { loadOverrides } from './overrides-store';
import { readState, mutateState } from './state-store';

export interface DocumentMeta {
  id: string;
  personId: string;
  url: string;         // blob CDN URL or /documents/personId/filename
  access?: 'private';  // set on Blob uploads since the privacy fix; undefined = legacy public blob or local file
  legacyPublicUrl?: string;
  deletionPending?: boolean;
  originalName: string;
  title?: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

const DOCS_DIR  = path.join(process.cwd(), 'public', 'documents');
const DB_KEY = 'documents';

// ─── Storage detection ─────────────────────────────────────────────────────

function shouldUseBlob(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_PRIVATE_READ_WRITE_TOKEN);
}

// ─── File storage ──────────────────────────────────────────────────────────

export async function uploadToStorage(
  personId: string,
  filename: string,
  buffer: Buffer,
  mimeType: string,
  access: 'public' | 'private' = 'public',
): Promise<string> {
  if (shouldUseBlob()) {
    const { put } = await import('@vercel/blob');
    const blob = await put(`documents/${personId}/${filename}`, buffer, {
      access,
      token: access === 'private' ? process.env.BLOB_PRIVATE_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN : process.env.BLOB_READ_WRITE_TOKEN,
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
  if (url.startsWith('https://')) {
    const { del } = await import('@vercel/blob');
    await del(url, { token: url.includes('.private.blob.vercel-storage.com') ? process.env.BLOB_PRIVATE_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN : process.env.BLOB_READ_WRITE_TOKEN });
    return;
  }
  const filename = url.split('/').pop();
  if (!filename || path.basename(personId) !== personId || !url.startsWith(`/documents/${personId}/`)) throw new Error('Emplacement de fichier invalide.');
  try { await fs.promises.unlink(path.join(DOCS_DIR, personId, filename)); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
}

// ─── Metadata storage ──────────────────────────────────────────────────────

async function readAll(): Promise<Record<string, DocumentMeta[]>> { return readState(DB_KEY, {}); }
export async function getDocumentsForPerson(personId: string): Promise<DocumentMeta[]> {
  const all = await readAll();
  const aliases = (await loadOverrides()).mergedPersons ?? {};
  const canonical = (id: string) => { const seen = new Set<string>(); while (aliases[id] && !seen.has(id)) { seen.add(id); id = aliases[id]; } return id; };
  return Object.entries(all).filter(([id]) => canonical(id) === canonical(personId)).flatMap(([, docs]) => docs);
}
export async function saveDocumentMeta(doc: DocumentMeta): Promise<void> {
  await mutateState<Record<string, DocumentMeta[]>, void>(DB_KEY, {}, all => { all[doc.personId] ??= []; all[doc.personId].push(doc); });
}
export async function deleteDocumentMeta(personId: string, docId: string): Promise<DocumentMeta | null> {
  const visible = (await getDocumentsForPerson(personId)).find(doc => doc.id === docId);
  if (!visible) return null;
  personId = visible.personId;
  return mutateState<Record<string, DocumentMeta[]>, DocumentMeta | null>(DB_KEY, {}, all => {
    const doc = (all[personId] ?? []).find(d => d.id === docId);
    all[personId] = (all[personId] ?? []).filter(d => d.id !== docId);
    return doc ?? null;
  });
}

export async function deleteDocument(personId: string, docId: string, removeFile = deleteFromStorage): Promise<boolean> {
  const visible = (await getDocumentsForPerson(personId)).find(d => d.id === docId);
  if (!visible) return false;
  const pending = await mutateState<Record<string, DocumentMeta[]>, DocumentMeta | null>(DB_KEY, {}, all => {
    const doc = all[visible.personId]?.find(d => d.id === docId);
    if (!doc) return null;
    doc.deletionPending = true;
    return structuredClone(doc);
  });
  if (!pending) return false;
  await removeFile(pending.url, pending.personId);
  if (pending.legacyPublicUrl) await removeFile(pending.legacyPublicUrl, pending.personId);
  await mutateState<Record<string, DocumentMeta[]>, void>(DB_KEY, {}, all => {
    const doc = all[pending.personId]?.find(d => d.id === docId);
    if (doc && (doc.url !== pending.url || doc.legacyPublicUrl !== pending.legacyPublicUrl)) throw new Error('Document modifié pendant la suppression.');
    all[pending.personId] = (all[pending.personId] ?? []).filter(d => d.id !== docId);
  });
  return true;
}
