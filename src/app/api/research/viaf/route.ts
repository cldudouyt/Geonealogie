import { NextRequest, NextResponse } from 'next/server';

export interface ViafResult {
  viafid: string;
  term: string;
  description: string;
  url: string;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || '';
  if (!q) return NextResponse.json({ results: [] });

  try {
    const res = await fetch(
      `https://www.viaf.org/viaf/AutoSuggest?query=${encodeURIComponent(q)}`,
      { headers: { 'User-Agent': 'Geonealogie/1.0', 'Accept': 'application/json' }, next: { revalidate: 3600 } }
    );
    if (!res.ok) return NextResponse.json({ results: [] });
    const data = await res.json();

    // Deduplicate by viafid, keep only personal names
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
  } catch (e) {
    return NextResponse.json({ results: [], error: String(e) });
  }
}
