import { requireRole } from '@/lib/session';
import { deleteDbUser } from '@/lib/db';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole('admin');
  const { id } = await params;
  await deleteDbUser(id);
  return Response.json({ ok: true });
}
