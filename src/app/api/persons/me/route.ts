import { getSession } from '@/lib/session';
import { listDbUsers, updateDbUserPersonId } from '@/lib/db';
import { getPerson } from '@/lib/gedcom-store';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Non authentifié' }, { status: 401 });
  if (!session.id) return Response.json({ error: 'Compte non lié à la base de données' }, { status: 400 });

  const { personId } = await req.json() as { personId?: string };
  if (!personId || typeof personId !== 'string') return Response.json({ error: 'personId requis' }, { status: 400 });

  const person = await getPerson(personId).catch(() => null);
  if (!person) return Response.json({ error: 'Personne introuvable dans l\'arbre' }, { status: 404 });

  const ok = await updateDbUserPersonId(session.id, personId);
  if (!ok) return Response.json({ error: 'Utilisateur introuvable' }, { status: 404 });

  return Response.json({ ok: true, personId });
}

export async function GET() {
  const session = await getSession();
  if (!session?.id) return Response.json({ personId: null });

  const users = await listDbUsers();
  const user = users.find(u => u.id === session.id);
  return Response.json({ personId: user?.personId ?? null });
}
