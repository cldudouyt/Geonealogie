import { NextRequest, NextResponse } from 'next/server';
import { deleteDocumentMeta, deleteFromStorage } from '@/lib/documents-store';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  const { id, docId } = await params;

  const doc = await deleteDocumentMeta(id, docId);
  if (!doc) {
    return NextResponse.json({ error: 'Document introuvable' }, { status: 404 });
  }

  await deleteFromStorage(doc.url, id);

  return NextResponse.json({ ok: true });
}
