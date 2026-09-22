import { NextRequest, NextResponse } from 'next/server';
import { getDocumentsForPerson } from '@/lib/documents-store';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  const { id, docId } = await params;

  const doc = (await getDocumentsForPerson(id)).find(d => d.id === docId);
  if (!doc) {
    return NextResponse.json({ error: 'Document introuvable' }, { status: 404 });
  }

  if (doc.deletionPending) return NextResponse.json({ error: 'Suppression en attente.' }, { status: 410 });

  if (doc.access === 'private') {
    const { get } = await import('@vercel/blob');
    const result = await get(doc.url, { access: 'private', token: process.env.BLOB_PRIVATE_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN });
    if (!result || result.statusCode !== 200) {
      return NextResponse.json({ error: 'Document introuvable' }, { status: 404 });
    }
    return new NextResponse(result.stream, {
      headers: {
        'Content-Type': result.blob.contentType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(doc.originalName)}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  }

  // Legacy public blob or local dev file — already reachable without this proxy.
  return NextResponse.redirect(new URL(doc.url, request.url));
}
