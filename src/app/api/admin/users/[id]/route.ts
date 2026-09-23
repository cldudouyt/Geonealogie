import { requireRole } from '@/lib/session';
import { deleteDbUser } from '@/lib/db';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await requireRole('admin');
  await deleteDbUser(params.id);
  return Response.json({ ok: true });
}
