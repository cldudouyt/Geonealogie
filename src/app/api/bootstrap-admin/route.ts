import { saveDbUser, listDbUsers, hasDb } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const secret = process.env.BOOTSTRAP_SECRET;
  if (!secret) return Response.json({ error: 'BOOTSTRAP_SECRET non configuré' }, { status: 403 });

  const { token, email, name, password } = await req.json() as {
    token: string; email: string; name: string; password: string;
  };

  if (token !== secret) return Response.json({ error: 'Token invalide' }, { status: 403 });
  if (!email || !password || password.length < 8) return Response.json({ error: 'email + password (8 car. min) requis' }, { status: 400 });
  if (!hasDb()) return Response.json({ error: 'DATABASE_URL non configuré' }, { status: 500 });

  const existing = await listDbUsers();
  if (existing.find(u => u.email?.toLowerCase() === email.toLowerCase())) {
    return Response.json({ error: 'Ce compte existe déjà' }, { status: 409 });
  }

  const salt = crypto.randomUUID();
  const passwordHash = await hashPassword(password, salt);
  const id = crypto.randomUUID();

  await saveDbUser({
    id, name: name || 'Admin', email, role: 'admin',
    passwordHash, salt, createdAt: new Date().toISOString(),
  });

  return Response.json({ ok: true, message: `Compte admin créé pour ${email}` });
}
