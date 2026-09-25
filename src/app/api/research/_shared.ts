import { NextRequest, NextResponse } from 'next/server';
import { readSessionToken, SESSION_COOKIE } from '@/lib/auth';
import { consumeLimit, limitKey } from '@/lib/request-limits';
import { clean } from './_parse';

export const RESEARCH_DEADLINE_MS = 8000;
export const MAX_QUERY_LENGTH = 200;
const RATE_MAX = 30;
const RATE_WINDOW_MS = 5 * 60_000;

export interface ResearchQuery { given: string; surname: string; q: string; name: string; signal: AbortSignal }

function clientIdentity(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return 'ip:' + (forwarded || req.headers.get('x-real-ip') || 'unknown');
}

export async function researchRequest(req: NextRequest, scope: string): Promise<ResearchQuery | NextResponse> {
  const params = req.nextUrl.searchParams;
  const given = params.get('given') ?? '';
  const surname = params.get('surname') ?? '';
  const q = params.get('q') ?? '';
  if (given.length > MAX_QUERY_LENGTH || surname.length > MAX_QUERY_LENGTH || q.length > MAX_QUERY_LENGTH * 2) {
    return NextResponse.json({ results: [], error: 'Requête trop longue.' }, { status: 400 });
  }
  const name = clean(surname ? `${clean(given.split(',')[0] ?? '')} ${surname}` : q);
  if (!name) return NextResponse.json({ results: [] });
  try {
    const session = await readSessionToken(req.cookies.get(SESSION_COOKIE)?.value ?? '').catch(() => null);
    const identity = session ? 'session:' + session.credential : clientIdentity(req);
    if (!await consumeLimit(limitKey('research-' + scope, identity), RATE_MAX, RATE_WINDOW_MS)) {
      return NextResponse.json({ results: [], error: 'Trop de recherches. Réessayez dans quelques minutes.' }, { status: 429, headers: { 'Retry-After': '300' } });
    }
  } catch {
    return NextResponse.json({ results: [], error: 'Service temporairement indisponible.' }, { status: 503 });
  }
  return { given, surname, q, name, signal: AbortSignal.any([req.signal, AbortSignal.timeout(RESEARCH_DEADLINE_MS)]) };
}

export function unavailable(): NextResponse {
  return NextResponse.json({ results: [], error: 'Source indisponible, réessayez plus tard.' }, { status: 502 });
}
