import { NextRequest, NextResponse } from 'next/server';

export interface MaitronResult {
  title: string;
  url: string;
  excerpt: string;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || '';
  if (!q) return NextResponse.json({ results: [] });

  const searchUrl = `https://maitron.fr/recherche-avancee/?exp1_type1=and1&exp1_from1=full1&choix=2&typetri=triP&exp1=${encodeURIComponent(q)}&search=OK`;

  try {
    const res = await fetch(searchUrl, {
      headers: { 'User-Agent': 'Geonealogie/1.0' },
      next: { revalidate: 3600 }, // cache 1h
    });
    if (!res.ok) return NextResponse.json({ results: [], error: 'Maitron unreachable' });

    const html = await res.text();

    // Extract the results list section
    const listMatch = html.match(/resultats-liste[^>]*>([\s\S]*?)<\/ul>/);
    if (!listMatch) return NextResponse.json({ results: [] });

    const listHtml = listMatch[1];

    // Parse each <li><a href="..."><strong>...</strong><br/><span class="excerpt">...</span></a></li>
    const results: MaitronResult[] = [];
    const itemRegex = /<li>\s*<a href="([^"]+)">\s*<strong>([\s\S]*?)<\/strong>[\s\S]*?<span class="excerpt">([\s\S]*?)<\/span>/g;
    let match;
    while ((match = itemRegex.exec(listHtml)) !== null) {
      const url = match[1];
      const title = match[2].replace(/&nbsp;/g, ' ').replace(/<[^>]+>/g, '').trim();
      const excerpt = match[3].replace(/&nbsp;/g, ' ').replace(/<[^>]+>/g, '').replace(/&#\d+;/g, '').trim();
      results.push({ url, title, excerpt });
    }

    return NextResponse.json({ results, searchUrl });
  } catch (e) {
    return NextResponse.json({ results: [], error: String(e) });
  }
}
