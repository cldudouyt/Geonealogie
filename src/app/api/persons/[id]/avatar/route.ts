import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const MAX_SIZE = 5 * 1024 * 1024; // 5 Mo

// Local mode only — blob mode uses /api/blob-upload directly from the client
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
    return NextResponse.json({ error: 'Fichier trop volumineux (max 5 Mo)' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Format non autorisé (JPG, PNG, GIF, WebP uniquement)' }, { status: 400 });
  }

  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  const filename = `${id}.${ext}`;
  const dir = path.join(process.cwd(), 'public', 'avatars');
  fs.mkdirSync(dir, { recursive: true });

  // Remove any previous avatar for this person
  for (const f of fs.readdirSync(dir)) {
    if (f.startsWith(`${id}.`)) fs.unlinkSync(path.join(dir, f));
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(dir, filename), buffer);

  return NextResponse.json({ photoUrl: `/avatars/${filename}` });
}
