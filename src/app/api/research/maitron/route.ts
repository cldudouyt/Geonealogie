import { NextRequest, NextResponse } from 'next/server';
import { researchRequest, unavailable } from '../_shared';
import { MAITRON_BASE, nameVariants, parseMaitronHtml, parseMaitronRest, type MaitronResult, type NameVariant } from '../_parse';

export type { MaitronResult } from '../_parse';

const BROWSER_UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

type Attempt = Promise<MaitronResult[] | null>;

async function restSearch(query: string, signal: AbortSignal): Attempt {
  const res = await fetch(`${MAITRON_BASE}/wp-json/wp/v2/posts?search=${encodeURIComponent(query)}&per_page=5&_fields=title,link,excerpt`, {
    headers: { 'User-Agent': BROWSER_UA, 'Accept': 'application/json' },
    cache: 'no-store',
    signal,
  });
  if (!res.ok) return null;
  return parseMaitronRest(await res.json());
}

async function htmlSearch(query: string, signal: AbortSignal): Attempt {
  const res = await fetch(`${MAITRON_BASE}/?s=${encodeURIComponent(query)}`, {
    headers: { 'User-Agent': BROWSER_UA, 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'fr-FR,fr;q=0.9' },
    cache: 'no-store',
    signal,
  });
  if (!res.ok) return null;
  return parseMaitronHtml(await res.text());
}

async function firstNonEmpty(variants: NameVariant[], deadline: AbortSignal): Promise<{ results: MaitronResult[]; reachable: boolean }> {
  if (variants.length === 0) return { results: [], reachable: false };
  const local = new AbortController();
  const signal = AbortSignal.any([deadline, local.signal]);
  const attempts = variants.flatMap(v => [restSearch(v.query, signal), htmlSearch(v.query, signal)]);
  let reachable = false;
  const winner = await new Promise<MaitronResult[] | null>(resolve => {
    let pending = attempts.length;
    for (const attempt of attempts) {
      attempt.then(results => {
        if (results) reachable = true;
        if (results && results.length > 0) resolve(results);
      }, () => {}).finally(() => { if (--pending === 0) resolve(null); });
    }
  });
  local.abort();
  await Promise.allSettled(attempts);
  return { results: winner ?? [], reachable };
}

export async function GET(req: NextRequest) {
  const input = await researchRequest(req, 'maitron');
  if (input instanceof NextResponse) return input;

  const variants = nameVariants(input.given, input.surname, input.q);
  const searchUrl = `${MAITRON_BASE}/?s=${encodeURIComponent(variants[0]?.query ?? input.name)}`;

  const exact = await firstNonEmpty(variants.filter(v => !v.namesake), input.signal);
  if (exact.results.length > 0) return NextResponse.json({ results: exact.results, searchUrl });

  const namesakes = input.signal.aborted ? { results: [], reachable: false } : await firstNonEmpty(variants.filter(v => v.namesake), input.signal);
  if (namesakes.results.length > 0) {
    return NextResponse.json({ results: namesakes.results.map(r => ({ ...r, namesake: true })), searchUrl });
  }

  if (!exact.reachable && !namesakes.reachable) return unavailable();
  return NextResponse.json({ results: [], searchUrl });
}
