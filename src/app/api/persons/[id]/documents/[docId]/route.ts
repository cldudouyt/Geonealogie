import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { deleteDocumentMeta, getDocumentFilePath } from '@/lib/documents-store';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  const { id, docId } = await params;

  const doc = deleteDocumentMeta(id, docId);
  if (!doc) {
    return NextResponse.json({ error: 'Document introuvable' }, { status: 404 });
  }

  try {
    fs.unlinkSync(getDocumentFilePath(id, doc.filename));
  } catch {
    // Fichier déjà absent, pas critique
  }

  return NextResponse.json({ ok: true });
}
