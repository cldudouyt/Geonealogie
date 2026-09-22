import { NextRequest, NextResponse } from 'next/server';
import { deleteDocument } from '@/lib/documents-store';
import { requireRole } from '@/lib/session';
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; docId: string }> }) {
  await requireRole('contributor');
  const { id, docId } = await params;
  try {
    if (!await deleteDocument(id, docId)) return NextResponse.json({ error: 'Document introuvable.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'Suppression incomplète. Le document reste en attente ; réessayez pour terminer.', deletionPending: true }, { status: 503 }); }
}
