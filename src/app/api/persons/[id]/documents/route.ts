import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import {
  getDocumentsForPerson,
  listAllDocuments,
  saveDocumentMeta,
  uploadToStorage,
} from '@/lib/documents-store';
import { getPerson } from '@/lib/gedcom-store';

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

const MAX_SIZE = 10 * 1024 * 1024; // 10 Mo

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return NextResponse.json({ documents: await getDocumentsForPerson(id) });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const person = await getPerson(id);
  if (!person) {
    return NextResponse.json({ error: 'Personne introuvable' }, { status: 404 });
  }

  const contentType = req.headers.get('content-type') ?? '';

  // ── Mode blob : le client a déjà uploadé le fichier, on reçoit juste les métadonnées en JSON ──
  if (contentType.includes('application/json')) {
    let body: { url: string; originalName: string; title?: string; mimeType: string; size: number };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 });
    }
    if (!body.url || !body.originalName || !body.mimeType || !body.size) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 });
    }
    let pathname: string;
    try {
      const url = new URL(body.url);
      if (url.protocol !== 'https:' || !/^[a-z0-9-]+\.private\.blob\.vercel-storage\.com$/.test(url.hostname) || url.search || url.hash) throw new Error('URL privée requise.');
      pathname = decodeURIComponent(url.pathname);
    } catch { return NextResponse.json({ error: 'URL de fichier privée invalide.' }, { status: 400 }); }
    if (!pathname.startsWith(`/documents/${id}/`) || pathname.includes('/../')) {
      return NextResponse.json({ error: 'Ce fichier n’appartient pas à cette fiche.' }, { status: 400 });
    }
    if ((await listAllDocuments()).some(d => d.url === body.url || d.legacyPublicUrl === body.url)) {
      return NextResponse.json({ error: 'Ce fichier est déjà rattaché à une fiche.' }, { status: 409 });
    }
    try {
      const { head } = await import('@vercel/blob');
      const stored = await head(body.url, { token: process.env.BLOB_PRIVATE_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN });
      if (stored.size !== body.size || stored.size > MAX_SIZE || !ALLOWED_TYPES.has(stored.contentType)) throw new Error('Fichier invalide.');
      body.mimeType = stored.contentType;
    } catch { return NextResponse.json({ error: 'Le fichier privé n’a pas pu être vérifié.' }, { status: 400 }); }
    const doc = {
      id: randomUUID(),
      personId: id,
      url: body.url,
      access: body.url.includes('.private.blob.vercel-storage.com') ? ('private' as const) : undefined,
      originalName: body.originalName,
      title: body.title?.trim() || undefined,
      mimeType: body.mimeType,
      size: body.size,
      uploadedAt: new Date().toISOString(),
    };
    await saveDocumentMeta(doc);
    return NextResponse.json({ document: doc }, { status: 201 });
  }

  // ── Mode local : upload via FormData (développement) ──
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Fichier trop volumineux (max 10 Mo)' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Type de fichier non autorisé' }, { status: 400 });
  }

  const title = formData.get('title')?.toString().trim() || undefined;
  const docId = randomUUID();
  const rawExt = file.name.includes('.')
    ? file.name.split('.').pop()!.toLowerCase().replace(/[^a-z0-9]/g, '')
    : 'bin';
  const storedFilename = `${docId}.${rawExt || 'bin'}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await uploadToStorage(id, storedFilename, buffer, file.type, 'private');

  const doc = {
    id: docId,
    personId: id,
    url,
    access: url.includes('.private.blob.vercel-storage.com') ? ('private' as const) : undefined,
    originalName: file.name,
    title,
    mimeType: file.type,
    size: file.size,
    uploadedAt: new Date().toISOString(),
  };

  await saveDocumentMeta(doc);
  return NextResponse.json({ document: doc }, { status: 201 });
}
