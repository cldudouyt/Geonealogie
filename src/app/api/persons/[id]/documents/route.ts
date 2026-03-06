import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import fs from 'fs';
import {
  getDocumentsForPerson,
  saveDocumentMeta,
  ensurePersonDocsDir,
  getDocumentFilePath,
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
  return NextResponse.json({ documents: getDocumentsForPerson(id) });
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
  const ext = rawExt || 'bin';
  const storedFilename = `${docId}.${ext}`;

  ensurePersonDocsDir(id);
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(getDocumentFilePath(id, storedFilename), buffer);

  const doc = {
    id: docId,
    personId: id,
    filename: storedFilename,
    originalName: file.name,
    title,
    mimeType: file.type,
    size: file.size,
    uploadedAt: new Date().toISOString(),
  };

  saveDocumentMeta(doc);
  return NextResponse.json({ document: doc }, { status: 201 });
}
