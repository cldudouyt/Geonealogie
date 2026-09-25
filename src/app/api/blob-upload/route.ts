import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';
import { getPerson } from '@/lib/gedcom-store';

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];
const MAX_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as HandleUploadBody;
    const jsonResponse = await handleUpload({
      body,
      token: process.env.BLOB_PRIVATE_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const match = /^documents\/([^/]+)\/[^/]+$/.exec(pathname);
        if (!match || match[1] === '.' || match[1] === '..' || !await getPerson(match[1])) throw new Error('Emplacement de document invalide.');
        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_SIZE,
          addRandomSuffix: true,
          allowOverwrite: false,
        };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: error instanceof SyntaxError ? 'Corps de requête invalide' : (error as Error).message }, { status: 400 });
  }
}
