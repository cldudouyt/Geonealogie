import { NextRequest, NextResponse } from 'next/server';

export interface MaitronResult {
  title: string;
  url: string;
  excerpt: string;
}

const BASE = 'https://maitron.fr';

function toAbsolute(href: string): string {
  if (href.startsWith('http')) return href;
  return `${BASE}${href.startsWith('/') ? '' : '/'}${href}`;
}

function stripTags(s: string): string {
  return s.replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function isArticleUrl(href: string): boolean {
  // SPIP articles: /spip.php?article123, or /notice/..., or /maitron-en-ligne?...
  return /spip\.php\?article\d|\/notice\/|maitron-en-ligne/.test(href);
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || '';
  if (!q) return NextResponse.json({ results: [] });

  const searchUrl = `${BASE}/recherche-avancee/?exp1_type1=and1&exp1_from1=full1&choix=2&typetri=triP&exp1=${encodeURIComponent(q)}&search=OK`;

  try {
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Geonealogie/1.0; +https://geonealogie.vercel.app)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr-FR,fr;q=0.9',
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return NextResponse.json({ results: [], error: `HTTP ${res.status}`, searchUrl });

    const html = await res.text();
    const results: MaitronResult[] = [];

    // Strategy 1: structured results list (SPIP default template — guillemets simples ou doubles)
    const listBlockMatch = html.match(/class=["'][^"']*resultats[^"']*["'][^>]*>([\s\S]{0,8000}?)<\/(?:ul|div)>/);
    if (listBlockMatch) {
      const block = listBlockMatch[1];
      // Each result: <a href="..."> with a <strong> title and optional .excerpt
      const entryRe = /<a\s+href=["']([^"']+)["'][^>]*>\s*(?:<[^>]+>\s*)*<strong[^>]*>([\s\S]*?)<\/strong>([\s\S]*?)(?=<\/a>|<a\s)/g;
      let m;
      while ((m = entryRe.exec(block)) !== null && results.length < 5) {
        const href = m[1];
        if (!isArticleUrl(href)) continue;
        const title = stripTags(m[2]);
        const afterTitle = m[3];
        const excerptMatch = afterTitle.match(/<span[^>]*class="[^"]*excerpt[^"]*"[^>]*>([\s\S]*?)<\/span>/);
        const excerpt = excerptMatch ? stripTags(excerptMatch[1]) : '';
        const url = toAbsolute(href);
        if (title && !results.find(r => r.url === url)) results.push({ url, title, excerpt });
      }
    }

    // Strategy 2: any article link in the page (fallback for layout changes)
    if (results.length === 0) {
      const linkRe = /<a\s+href=["']([^"']+)["'][^>]*>([\s\S]{3,120}?)<\/a>/g;
      let m2;
      while ((m2 = linkRe.exec(html)) !== null && results.length < 5) {
        const href = m2[1];
        if (!isArticleUrl(href)) continue;
        const title = stripTags(m2[2]);
        if (title.length < 4) continue;
        const url = toAbsolute(href);
        if (!results.find(r => r.url === url)) results.push({ url, title, excerpt: '' });
      }
    }

    return NextResponse.json({ results, searchUrl });
  } catch (e) {
    return NextResponse.json({ results: [], error: String(e), searchUrl });
  }
}
