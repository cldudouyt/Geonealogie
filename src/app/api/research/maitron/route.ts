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
  // Exclude navigation, search, category, tag, author, feed pages
  return !/\?s=|\/category\/|\/tag\/|\/author\/|\/feed\/|\/page\/|#/.test(url)
    && /maitron\.fr\/.+/.test(url);
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || '';
  if (!q) return NextResponse.json({ results: [] });

  const searchUrl = `${BASE}/?s=${encodeURIComponent(q)}`;

  try {
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr-FR,fr;q=0.9',
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return NextResponse.json({ results: [], error: `HTTP ${res.status}`, searchUrl });

    // Strategy 0 — WordPress REST API (JSON, no parsing needed)
    try {
      const apiUrl = `${BASE}/wp-json/wp/v2/posts?search=${encodeURIComponent(q)}&per_page=5&_fields=title,link,excerpt`;
      const apiRes = await fetch(apiUrl, {
        headers: { 'User-Agent': 'Geonealogie/1.0', 'Accept': 'application/json' },
        next: { revalidate: 3600 },
      });
      if (apiRes.ok) {
        const posts: Array<{ title: { rendered: string }; link: string; excerpt: { rendered: string } }> = await apiRes.json();
        if (Array.isArray(posts) && posts.length > 0) {
          return NextResponse.json({
            results: posts.map(p => ({
              title: stripTags(p.title?.rendered ?? ''),
              url: p.link,
              excerpt: stripTags(p.excerpt?.rendered ?? '').slice(0, 200),
            })),
            searchUrl,
          });
        }
      }
    } catch { /* fall through to HTML scraping */ }

    const html = await res.text();
    const results: MaitronResult[] = [];

    // Strategy 1 — WordPress: title links are inside <h2> or <h3> heading tags
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

      // Look for excerpt after the heading in the surrounding ~500 chars
      const afterHeading = html.slice(hMatch.index + hMatch[0].length, hMatch.index + hMatch[0].length + 600);
      const excerptMatch = afterHeading.match(/<(?:p|div)[^>]*class=["'][^"']*(?:summary|excerpt|content)[^"']*["'][^>]*>([\s\S]*?)<\/(?:p|div)>/i)
        || afterHeading.match(/<p[^>]*>([\s\S]*?)<\/p>/);
      const excerpt = excerptMatch ? stripTags(excerptMatch[1]).slice(0, 200) : '';

      if (!results.find(r => r.url === url)) results.push({ url, title, excerpt });
    }

    // Strategy 2 — WordPress <article> blocks (title is first substantial link)
    if (results.length === 0) {
      const articleRe = /<article[^>]*>([\s\S]*?)<\/article>/gi;
      let artMatch;
      while ((artMatch = articleRe.exec(html)) !== null && results.length < 5) {
        const block = artMatch[1];
        // Prefer links with rel="bookmark", fall back to first substantial link
        const bookmarkMatch = block.match(/href=["']([^"']+)["'][^>]*rel=["']bookmark["']|rel=["']bookmark["'][^>]*href=["']([^"']+)["']/);
        let href = bookmarkMatch ? (bookmarkMatch[1] || bookmarkMatch[2]) : '';
        if (!href) {
          const anyLink = block.match(/<a[^>]+href=["']([^"'#][^"']+)["']/);
          href = anyLink ? anyLink[1] : '';
        }
        if (!href || !isMaitronPage(href)) continue;
        const url = toAbsolute(href);

        // Title: prefer heading link text
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

    return NextResponse.json({ results, searchUrl });
  } catch (e) {
    return NextResponse.json({ results: [], error: String(e), searchUrl });
  }
}
