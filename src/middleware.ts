import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // La page de login et le clear-cache admin sont toujours accessibles
  if (pathname === '/login') return NextResponse.next();
  if (pathname === '/api/admin/clear-cache') return NextResponse.next();
  if (pathname === '/api/admin/debug-person') return NextResponse.next();
  if (pathname === '/api/admin/debug-journey') return NextResponse.next();
  if (pathname.startsWith('/api/journey/')) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const valid = token ? await verifySessionToken(token) : false;

  if (!valid) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Protège toutes les routes sauf les assets statiques Next.js
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
