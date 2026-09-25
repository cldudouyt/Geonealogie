import { NextRequest, NextResponse } from 'next/server';
import { researchRequest, unavailable } from '../_shared';

export interface ViafResult {
  viafid: string;
  term: string;
  description: string;
  url: string;
}

export async function GET(req: NextRequest) {
  const input = await researchRequest(req, 'viaf');
  if (input instanceof NextResponse) return input;

  try {
    const res = await fetch(
      `https://www.viaf.org/viaf/AutoSuggest?query=${encodeURIComponent(input.name)}`,
      { headers: { 'User-Agent': 'Geonealogie/1.0', 'Accept': 'application/json' }, cache: 'no-store', signal: input.signal }
    );
    if (!res.ok) return unavailable();
    const data = await res.json();

    const seen = new Set<string>();
    const results: ViafResult[] = [];
    for (const item of (data.result ?? [])) {
      if (item.nametype !== 'personal') continue;
      if (seen.has(item.viafid)) continue;
      seen.add(item.viafid);
      results.push({
        viafid: item.viafid,
        term: item.displayForm ?? item.term,
        description: '',
        url: `https://viaf.org/viaf/${item.viafid}/`,
      });
      if (results.length >= 3) break;
    }

    return NextResponse.json({ results });
  } catch {
    return unavailable();
  }
}
