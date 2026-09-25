import { NextRequest, NextResponse } from 'next/server';
import { researchRequest, unavailable } from '../_shared';

export interface WikidataResult {
  id: string;
  label: string;
  description: string;
  url: string;
}

export async function GET(req: NextRequest) {
  const input = await researchRequest(req, 'wikidata');
  if (input instanceof NextResponse) return input;

  try {
    const res = await fetch(
      `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(input.name)}&language=fr&type=item&format=json&limit=3`,
      { headers: { 'User-Agent': 'Geonealogie/1.0' }, cache: 'no-store', signal: input.signal }
    );
    if (!res.ok) return unavailable();
    const data = await res.json();

    const results: WikidataResult[] = (data.search ?? []).map((item: { id: string; label: string; description?: string }) => ({
      id: item.id,
      label: item.label,
      description: item.description ?? '',
      url: `https://www.wikidata.org/wiki/${item.id}`,
    }));

    return NextResponse.json({ results });
  } catch {
    return unavailable();
  }
}
