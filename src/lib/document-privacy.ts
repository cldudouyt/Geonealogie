import { get, put, del } from '@vercel/blob';
import { readState, mutateState } from './state-store';
import type { DocumentMeta } from './documents-store';

export function isLegacyBlob(url: string): boolean {
  try { const u = new URL(url); return u.protocol === 'https:' && /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/.test(u.hostname); } catch { return false; }
}
export async function migrateDocument(id: string) {
  const all = await readState<Record<string, DocumentMeta[]>>('documents', {});
  const doc = Object.values(all).flat().find(d => d.id === id);
  if (!doc) throw new Error('Document introuvable.');
  if (doc.legacyPublicUrl) {
    await del(doc.legacyPublicUrl);
    await mutateState<Record<string, DocumentMeta[]>, void>('documents', {}, state => {
      const current = Object.values(state).flat().find(d => d.id === id);
      if (current && current.legacyPublicUrl === doc.legacyPublicUrl) delete current.legacyPublicUrl;
    });
    return;
  }
  if (doc.access === 'private') return;
  if (!isLegacyBlob(doc.url)) throw new Error('Ce document nécessite une migration manuelle.');
  const response = await fetch(doc.url, { redirect: 'error', signal: AbortSignal.timeout(15000) });
  if (!response.ok || !response.body) throw new Error('Lecture du document impossible.');
  const chunks: Uint8Array[] = []; let size = 0;
  for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
    size += chunk.length;
    if (size > 10 * 1024 * 1024) throw new Error('Document supérieur à 10 Mo : migration manuelle nécessaire.');
    chunks.push(chunk);
  }
  const blob = await put(`documents/${doc.personId}/${crypto.randomUUID()}`, Buffer.concat(chunks), { access: 'private', contentType: doc.mimeType, token: process.env.BLOB_PRIVATE_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN });
  const verified = await get(blob.url, { access: 'private', token: process.env.BLOB_PRIVATE_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN });
  if (!verified || verified.statusCode !== 200 || verified.blob.size !== size) throw new Error('La copie privée n’a pas pu être vérifiée.');
  const copied = Buffer.from(await new Response(verified.stream).arrayBuffer());
  if (!copied.equals(Buffer.concat(chunks))) throw new Error('Le contenu de la copie diffère de l’original.');
  await mutateState<Record<string, DocumentMeta[]>, void>('documents', {}, state => {
    const current = Object.values(state).flat().find(d => d.id === id);
    if (!current || current.url !== doc.url) throw new Error('Document modifié entre-temps. Rechargez la page.');
    current.url = blob.url; current.access = 'private'; current.legacyPublicUrl = doc.url;
  });
  await migrateDocument(id);
}
