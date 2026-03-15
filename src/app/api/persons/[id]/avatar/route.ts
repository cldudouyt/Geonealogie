import { NextRequest, NextResponse } from 'next/server';
import { uploadToStorage } from '@/lib/documents-store';
import { savePersonEdit } from '@/lib/overrides-store';
import { clearStore } from '@/lib/gedcom-store';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const MAX_SIZE = 4 * 1024 * 1024; // 4 Mo (sous la limite Vercel de 4.5 Mo)

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

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
    return NextResponse.json({ error: 'Fichier trop volumineux (max 4 Mo)' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Format non autorisé (JPG, PNG, GIF, WebP uniquement)' }, { status: 400 });
  }

  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  const filename = `avatar-${id}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  // uploadToStorage uses Vercel Blob in production, local public/documents/ in dev
  const photoUrl = await uploadToStorage(id, filename, buffer, file.type);

  // Persist immediately so the tree and person page reflect the new photo without
  // requiring the user to also click "Enregistrer les modifications"
  await savePersonEdit(id, { photoUrl });
  clearStore();

  return NextResponse.json({ photoUrl });
}
