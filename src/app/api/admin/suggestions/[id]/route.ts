import { requireRole } from '@/lib/session';
import { updateSuggestionStatus } from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole('admin');
  const { id } = await params;
  const { status } = (await req.json()) as { status: string };
  await updateSuggestionStatus(id, status);
  return Response.json({ ok: true });
}
