import { requireRole } from '@/lib/session';
import { deleteDbUser } from '@/lib/db';

const ERRORS = {
  missing: { status: 404, error: 'Compte introuvable.' },
  self: { status: 400, error: 'Vous ne pouvez pas révoquer votre propre compte.' },
  'last-admin': { status: 400, error: 'Impossible de révoquer le dernier administrateur.' },
} as const;

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole('admin');
  const { id } = await params;
  const result = await deleteDbUser(id, session.id);
  if (result !== 'ok') return Response.json({ error: ERRORS[result].error }, { status: ERRORS[result].status });
  return Response.json({ ok: true });
}
