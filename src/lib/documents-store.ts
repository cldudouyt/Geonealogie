import fs from 'fs';
import path from 'path';
import { loadOverrides } from './overrides-store';
import { readState, mutateState } from './state-store';

export interface DocumentMeta {
  id: string;
  personId: string;
  url: string;         // blob CDN URL or /documents/personId/filename
  access?: 'private';  // set on Blob uploads since the privacy fix; undefined = legacy public blob or local file
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
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
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
