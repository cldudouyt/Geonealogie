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

    const results: MaitronResult[] = [];

    // Strategy 1: structured list block
    const listMatch = html.match(/resultats-liste[^>]*>([\s\S]*?)<\/ul>/);
    if (listMatch) {
      const listHtml = listMatch[1];
      const itemRegex = /<li>\s*<a href="([^"]+)">\s*<strong>([\s\S]*?)<\/strong>[\s\S]*?<span class="excerpt">([\s\S]*?)<\/span>/g;
      let m;
      while ((m = itemRegex.exec(listHtml)) !== null) {
        results.push({
          url: m[1].startsWith('http') ? m[1] : `https://maitron.fr${m[1]}`,
          title: m[2].replace(/&nbsp;/g, ' ').replace(/<[^>]+>/g, '').trim(),
          excerpt: m[3].replace(/&nbsp;/g, ' ').replace(/<[^>]+>/g, '').replace(/&#\d+;/g, '').trim(),
        });
      }
    }

    // Strategy 2: any link to /spip.php?article or individual notice
    if (results.length === 0) {
      const anyLink = /<a[^>]+href="(https?:\/\/maitron\.fr\/[^"]*(?:article|notice)[^"]*)"[^>]*>\s*([^<]{5,80})/g;
      let m2;
      while ((m2 = anyLink.exec(html)) !== null && results.length < 5) {
        const url = m2[1];
        const title = m2[2].replace(/&nbsp;/g, ' ').trim();
        if (!results.find(r => r.url === url)) results.push({ url, title, excerpt: '' });
      }
    }

    return NextResponse.json({ results, searchUrl });
  } catch (e) {
    return NextResponse.json({ results: [], error: String(e) });
  }
}
