import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth';
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin || new URL(origin).host !== request.headers.get('host')) return NextResponse.json({ error: 'Origine non autorisée.' }, { status: 403 });
  (await cookies()).delete(SESSION_COOKIE);
  return NextResponse.redirect(new URL('/login', request.url), 303);
}
