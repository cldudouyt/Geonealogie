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
  return s.replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '').replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function isMaitronArticleUrl(href: string): boolean {
  // WordPress: https://maitron.fr/notice/..., https://maitron.fr/12345-..., /?p=...
  // SPIP legacy: /spip.php?article..., /maitron-en-ligne?...
  if (!href.includes('maitron.fr') && !href.startsWith('/')) return false;
  return /maitron\.fr\/\d|maitron\.fr\/notice\/|spip\.php\?article\d|maitron-en-ligne|\?p=\d/.test(href);
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || '';
  if (!q) return NextResponse.json({ results: [] });

  // Maitron is now WordPress — use the simple ?s= search endpoint
  const searchUrl = `${BASE}/?s=${encodeURIComponent(q)}`;

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

    // Strategy 1: WordPress <article> elements (standard WP search results)
    const articleRe = /<article[^>]*>([\s\S]*?)<\/article>/g;
    let artMatch;
    while ((artMatch = articleRe.exec(html)) !== null && results.length < 5) {
      const block = artMatch[1];

      // Title link: <h2 class="entry-title"><a href="...">Title</a></h2>
      const linkMatch = block.match(/<a\s+(?:rel="bookmark"\s+)?href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/);
      if (!linkMatch) continue;

      const url = toAbsolute(linkMatch[1]);
      const title = stripTags(linkMatch[2]);
      if (!title || title.length < 3) continue;

      // Excerpt: .entry-summary p or .excerpt or plain <p>
      const excerptMatch = block.match(/<div[^>]*class=["'][^"']*(?:summary|excerpt)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)
        || block.match(/<p[^>]*class=["'][^"']*excerpt[^"']*["'][^>]*>([\s\S]*?)<\/p>/i)
        || block.match(/<p>([\s\S]*?)<\/p>/);
      const excerpt = excerptMatch ? stripTags(excerptMatch[1]).slice(0, 200) : '';

      if (!results.find(r => r.url === url)) results.push({ url, title, excerpt });
    }

    // Strategy 2: any link whose URL matches a Maitron article pattern (fallback)
    if (results.length === 0) {
      const linkRe = /<a\s+href=["']([^"']+)["'][^>]*>([\s\S]{4,120}?)<\/a>/g;
      let m;
      while ((m = linkRe.exec(html)) !== null && results.length < 5) {
        const href = m[1];
        if (!isMaitronArticleUrl(href)) continue;
        const title = stripTags(m[2]);
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
