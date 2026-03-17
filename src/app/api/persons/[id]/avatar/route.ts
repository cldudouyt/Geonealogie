import { NextRequest, NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { uploadToStorage } from '@/lib/documents-store';
import { savePersonEdit } from '@/lib/overrides-store';
import { clearStore } from '@/lib/gedcom-store';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const MAX_SIZE = 10 * 1024 * 1024; // 10 Mo

// ── Vercel Blob client-side upload (production) ──────────────────────────────
// The browser uploads directly to Vercel Blob, bypassing the 4.5 MB serverless
// body limit. This route only handles token generation and upload-completion.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const contentType = req.headers.get('content-type') ?? '';

  // ── Local dev fallback: regular FormData POST ─────────────────────────────
  if (contentType.includes('multipart/form-data')) {
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
      return NextResponse.json({ error: 'Format non autorisé (JPG, PNG, GIF, WebP uniquement)' }, { status: 400 });
    }

    const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
    const filename = `avatar-${id}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const photoUrl = await uploadToStorage(id, filename, buffer, file.type);
    await savePersonEdit(id, { photoUrl });
    clearStore();
    return NextResponse.json({ photoUrl });
  }

  // ── Production: Vercel Blob client-side upload token + completion ─────────
  let body: HandleUploadBody;
  try {
    body = await req.json() as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 });
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        return {
          allowedContentTypes: [...ALLOWED_TYPES],
          maximumSizeInBytes: MAX_SIZE,
          tokenPayload: JSON.stringify({ personId: id }),
          addRandomSuffix: false,
          pathname: `documents/${id}/${pathname}`,
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const { personId } = JSON.parse(tokenPayload!);
        await savePersonEdit(personId, { photoUrl: blob.url });
        clearStore();
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (err) {
    console.error('[avatar] handleUpload error:', err);
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
