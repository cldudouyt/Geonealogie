import { NextRequest, NextResponse } from 'next/server';
import { researchRequest, unavailable } from '../_shared';
import { parseBnfRecords } from '../_parse';

export type { BnfResult } from '../_parse';

export async function GET(req: NextRequest) {
  const input = await researchRequest(req, 'bnf');
  if (input instanceof NextResponse) return input;

  const sruUrl = `https://catalogue.bnf.fr/api/SRU?operation=searchRetrieve&version=1.2&query=bib.anywhere+all+%22${encodeURIComponent(input.name)}%22&recordSchema=dublincore&maximumRecords=5`;

  try {
    const res = await fetch(sruUrl, {
      headers: { 'User-Agent': 'Geonealogie/1.0' },
      cache: 'no-store',
      signal: input.signal,
    });
    if (!res.ok) return unavailable();
    return NextResponse.json({ results: parseBnfRecords(await res.text()), searchUrl: sruUrl });
  } catch {
    return unavailable();
  }
}
