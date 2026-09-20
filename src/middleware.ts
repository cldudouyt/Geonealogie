import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, readSessionToken, permits } from '@/lib/auth';
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === '/login') return NextResponse.next();
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value || '');
  if (!session) {
    if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 });
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (pathname === '/api/logout') return NextResponse.next();
  const admin = /^\/(api\/)?admin(\/|$)/.test(pathname) || pathname.startsWith('/doublons') || pathname.startsWith('/history') || pathname.startsWith('/api/geocode/batch') || pathname === '/api/export/backup';
  const writing = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
  const editor = /\/person\/(new|[^/]+\/edit)$/.test(pathname);
  const minimum = admin ? 'admin' : (writing || editor) ? 'contributor' : 'reader';
  if (!permits(session.role, minimum)) return NextResponse.json({ error: 'Accès réservé à un rôle autorisé.' }, { status: 403 });
  return NextResponse.next();
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest\\.json).*)'] };
