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

function isMaitronPage(url: string): boolean {
  if (!url.includes('maitron.fr') && !url.startsWith('/')) return false;
  return !/\?s=|\/category\/|\/tag\/|\/author\/|\/feed\/|\/page\/|#/.test(url)
    && /maitron\.fr\/.+/.test(url);
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/(?:^|\s)\S/g, c => c.toUpperCase());
}

// Build query variants to maximise recall on Maitron (which stores entries as "NOM Prénom")
function queryVariants(q: string): string[] {
  const normalized = titleCase(q);
  const words = q.trim().split(/\s+/);
  const reversed = words.length > 1
    ? titleCase([...words.slice(1), words[0]].join(' '))
    : normalized;
  const surnameOnly = words.length > 1 ? titleCase(words[words.length - 1]) : normalized;
  return [...new Set([normalized, reversed, surnameOnly])];
}

async function wpRestSearch(query: string): Promise<MaitronResult[] | null> {
  const apiUrl = `${BASE}/wp-json/wp/v2/posts?search=${encodeURIComponent(query)}&per_page=5&_fields=title,link,excerpt`;
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), 6000);
  try {
    const apiRes = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Accept': 'application/json',
      },
      cache: 'no-store',
      signal: ctrl.signal,
    });
    if (!apiRes.ok) return null;
    const data = await apiRes.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const results: MaitronResult[] = data
      .map((p: { title?: { rendered?: string }; link?: string; excerpt?: { rendered?: string } }) => ({
        title: stripTags(p.title?.rendered ?? ''),
        url: p.link ?? '',
        excerpt: stripTags(p.excerpt?.rendered ?? '').slice(0, 200),
      }))
      .filter((r: MaitronResult) => r.title.length > 2 && r.url.length > 0);
    return results.length > 0 ? results : null;
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || '';
  if (!q) return NextResponse.json({ results: [] });

  const searchUrl = `${BASE}/?s=${encodeURIComponent(q)}`;
  const variants = queryVariants(q);

  // Strategy 0 — WordPress REST API: try each query variant
  for (const variant of variants) {
    const res = await wpRestSearch(variant);
    if (res) return NextResponse.json({ results: res, searchUrl, strategy: 'wp-rest', variant });
  }

  // Strategies 1-3 — HTML scraping fallback (try each variant)
  for (const variant of variants) {
  try {
    const ctrlHtml = new AbortController();
    setTimeout(() => ctrlHtml.abort(), 8000);
    const variantSearchUrl = `${BASE}/?s=${encodeURIComponent(variant)}`;
    const res = await fetch(variantSearchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr-FR,fr;q=0.9',
      },
      cache: 'no-store',
      signal: ctrlHtml.signal,
    });

    if (!res.ok) continue;

    const html = await res.text();
    const results: MaitronResult[] = [];

    // Strategy 1 — heading links in <h2>/<h3>
    const headingRe = /<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi;
    let hMatch;
    while ((hMatch = headingRe.exec(html)) !== null && results.length < 5) {
      const hBlock = hMatch[1];
      const linkMatch = hBlock.match(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/);
      if (!linkMatch) continue;
      const href = linkMatch[1];
      if (!isMaitronPage(href)) continue;
      const url = toAbsolute(href);
      const title = stripTags(linkMatch[2]);
      if (title.length < 3) continue;

      const afterHeading = html.slice(hMatch.index + hMatch[0].length, hMatch.index + hMatch[0].length + 600);
      const excerptMatch = afterHeading.match(/<(?:p|div)[^>]*class=["'][^"']*(?:summary|excerpt|content)[^"']*["'][^>]*>([\s\S]*?)<\/(?:p|div)>/i)
        || afterHeading.match(/<p[^>]*>([\s\S]*?)<\/p>/);
      const excerpt = excerptMatch ? stripTags(excerptMatch[1]).slice(0, 200) : '';

      if (!results.find(r => r.url === url)) results.push({ url, title, excerpt });
    }

    // Strategy 2 — <article> blocks
    if (results.length === 0) {
      const articleRe = /<article[^>]*>([\s\S]*?)<\/article>/gi;
      let artMatch;
      while ((artMatch = articleRe.exec(html)) !== null && results.length < 5) {
        const block = artMatch[1];
        const bookmarkMatch = block.match(/href=["']([^"']+)["'][^>]*rel=["']bookmark["']|rel=["']bookmark["'][^>]*href=["']([^"']+)["']/);
        let href = bookmarkMatch ? (bookmarkMatch[1] || bookmarkMatch[2]) : '';
        if (!href) {
          const anyLink = block.match(/<a[^>]+href=["']([^"'#][^"']+)["']/);
          href = anyLink ? anyLink[1] : '';
        }
        if (!href || !isMaitronPage(href)) continue;
        const url = toAbsolute(href);

        const hLinkMatch = block.match(/<h[1-4][^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i);
        const title = hLinkMatch ? stripTags(hLinkMatch[1]) : '';
        if (title.length < 3) continue;

        const excerptMatch = block.match(/<div[^>]*class=["'][^"']*(?:summary|excerpt|content)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)
          || block.match(/<p[^>]*>([\s\S]*?)<\/p>/);
        const excerpt = excerptMatch ? stripTags(excerptMatch[1]).slice(0, 200) : '';
        if (!results.find(r => r.url === url)) results.push({ url, title, excerpt });
      }
    }

    // Strategy 3 — catch-all: any maitron.fr link with meaningful anchor text
    if (results.length === 0) {
      const seen = new Set<string>();
      const linkRe = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]{5,150}?)<\/a>/g;
      let m;
      while ((m = linkRe.exec(html)) !== null && results.length < 5) {
        const href = m[1];
        if (!isMaitronPage(href) || seen.has(href)) continue;
        const title = stripTags(m[2]);
        if (title.length < 5 || /menu|nav|skip|footer|sidebar/i.test(title)) continue;
        seen.add(href);
        results.push({ url: toAbsolute(href), title, excerpt: '' });
      }
    }

    if (results.length > 0) return NextResponse.json({ results, searchUrl: variantSearchUrl });
  } catch { /* try next variant */ }
  } // end for variants

  return NextResponse.json({ results: [], searchUrl });
}
