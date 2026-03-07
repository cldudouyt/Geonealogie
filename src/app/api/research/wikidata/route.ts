import { NextRequest, NextResponse } from 'next/server';

export interface WikidataResult {
  id: string;
  label: string;
  description: string;
  url: string;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || '';
  if (!q) return NextResponse.json({ results: [] });

  try {
    const res = await fetch(
      `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(q)}&language=fr&type=item&format=json&limit=3`,
      { headers: { 'User-Agent': 'Geonealogie/1.0' }, next: { revalidate: 3600 } }
    );
    if (!res.ok) return NextResponse.json({ results: [] });
    const data = await res.json();

    const results: WikidataResult[] = (data.search ?? []).map((item: { id: string; label: string; description?: string }) => ({
      id: item.id,
      label: item.label,
      description: item.description ?? '',
      url: `https://www.wikidata.org/wiki/${item.id}`,
    }));

    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json({ results: [], error: String(e) });
  }
}
