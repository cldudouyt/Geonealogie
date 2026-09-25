export interface BnfResult {
  title: string;
  creator: string;
  date: string;
  url: string;
}

const NAMED_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body: string) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) return match;
      return String.fromCodePoint(code);
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? match;
  });
}

export function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
}

export interface NameVariant { query: string; namesake: boolean }

export const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_m, sep: string, c: string) => sep + c.toUpperCase());

export function nameVariants(given: string, surname: string, q = ''): NameVariant[] {
  const g = clean(given.split(',')[0] ?? '');
  const s = clean(surname);
  if (!s) return q.trim() ? [{ query: clean(q), namesake: false }] : [];
  if (!g) return [{ query: s, namesake: false }];
  const givenTitle = titleCase(g);
  const variants: NameVariant[] = [
    { query: `${givenTitle} ${s}`, namesake: false },
    { query: `${s.toUpperCase()} ${givenTitle}`, namesake: false },
    { query: s, namesake: true },
  ];
  const seen = new Set<string>();
  return variants.filter(v => { const k = v.query.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
}

export function parseBnfRecords(xml: string, limit = 3): BnfResult[] {
  const results: BnfResult[] = [];
  const recordRegex = /<srw:recordData>([\s\S]*?)<\/srw:recordData>/g;
  let recMatch;
  while ((recMatch = recordRegex.exec(xml)) !== null) {
    const block = recMatch[1];
    const urlMatch = block.match(/<dc:identifier>(http:\/\/catalogue\.bnf\.fr\/[^<]+)<\/dc:identifier>/);
    if (!urlMatch) continue;
    const url = decodeEntities(urlMatch[1].trim());

    const titleMatch = block.match(/<dc:title>([^<]+)<\/dc:title>/);
    const creatorMatch = block.match(/<dc:creator>([^<]+)<\/dc:creator>/);
    const dateMatch = block.match(/<dc:date>([^<]+)<\/dc:date>/);

    const title = titleMatch ? decodeEntities(titleMatch[1]).trim() : '';
    const creator = creatorMatch ? decodeEntities(creatorMatch[1]).replace(/\s*\(.*?\)\..*$/, '').trim() : '';
    const date = dateMatch ? decodeEntities(dateMatch[1]).trim() : '';

    if (title) results.push({ title, creator, date, url });
    if (results.length >= limit) break;
  }
  return results;
}


export interface MaitronResult {
  title: string;
  url: string;
  excerpt: string;
  namesake?: boolean;
}

export const MAITRON_BASE = 'https://maitron.fr';

export function maitronPageUrl(rawHref: string): string | null {
  const href = decodeEntities(rawHref.trim());
  if (!href || href.includes('#')) return null;
  let url: URL;
  try { url = new URL(href, MAITRON_BASE + '/'); } catch { return null; }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (url.hostname !== 'maitron.fr' && url.hostname !== 'www.maitron.fr') return null;
  if (url.pathname === '/' && !url.search) return null;
  if (url.searchParams.has('s') || /\/(category|tag|author|feed|page)\//.test(url.pathname)) return null;
  url.protocol = 'https:';
  return url.toString();
}

export function parseMaitronHtml(html: string, limit = 5): MaitronResult[] {
  const results: MaitronResult[] = [];
  const add = (r: MaitronResult) => { if (!results.some(x => x.url === r.url)) results.push(r); };

  const headingRe = /<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi;
  let hMatch;
  while ((hMatch = headingRe.exec(html)) !== null && results.length < limit) {
    const linkMatch = hMatch[1].match(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/);
    if (!linkMatch) continue;
    const url = maitronPageUrl(linkMatch[1]);
    if (!url) continue;
    const title = stripTags(linkMatch[2]);
    if (title.length < 3) continue;
    const afterHeading = html.slice(hMatch.index + hMatch[0].length, hMatch.index + hMatch[0].length + 600);
    const excerptMatch = afterHeading.match(/<(?:p|div)[^>]*class=["'][^"']*(?:summary|excerpt|content)[^"']*["'][^>]*>([\s\S]*?)<\/(?:p|div)>/i)
      || afterHeading.match(/<p[^>]*>([\s\S]*?)<\/p>/);
    add({ url, title, excerpt: excerptMatch ? stripTags(excerptMatch[1]).slice(0, 200) : '' });
  }

  if (results.length === 0) {
    const articleRe = /<article[^>]*>([\s\S]*?)<\/article>/gi;
    let artMatch;
    while ((artMatch = articleRe.exec(html)) !== null && results.length < limit) {
      const block = artMatch[1];
      const bookmarkMatch = block.match(/href=["']([^"']+)["'][^>]*rel=["']bookmark["']|rel=["']bookmark["'][^>]*href=["']([^"']+)["']/);
      let href = bookmarkMatch ? (bookmarkMatch[1] || bookmarkMatch[2]) : '';
      if (!href) href = block.match(/<a[^>]+href=["']([^"'#][^"']+)["']/)?.[1] ?? '';
      const url = href ? maitronPageUrl(href) : null;
      if (!url) continue;
      const hLinkMatch = block.match(/<h[1-4][^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i);
      const title = hLinkMatch ? stripTags(hLinkMatch[1]) : '';
      if (title.length < 3) continue;
      const excerptMatch = block.match(/<div[^>]*class=["'][^"']*(?:summary|excerpt|content)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)
        || block.match(/<p[^>]*>([\s\S]*?)<\/p>/);
      add({ url, title, excerpt: excerptMatch ? stripTags(excerptMatch[1]).slice(0, 200) : '' });
    }
  }

  if (results.length === 0) {
    const linkRe = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]{5,150}?)<\/a>/g;
    let m;
    while ((m = linkRe.exec(html)) !== null && results.length < limit) {
      const url = maitronPageUrl(m[1]);
      if (!url) continue;
      const title = stripTags(m[2]);
      if (title.length < 5 || /menu|nav|skip|footer|sidebar/i.test(title)) continue;
      add({ url, title, excerpt: '' });
    }
  }
  return results;
}

export function parseMaitronRest(data: unknown): MaitronResult[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((p: { title?: { rendered?: string }; link?: string; excerpt?: { rendered?: string } }) => ({
      title: stripTags(p?.title?.rendered ?? ''),
      url: typeof p?.link === 'string' ? maitronPageUrl(p.link) ?? '' : '',
      excerpt: stripTags(p?.excerpt?.rendered ?? '').slice(0, 200),
    }))
    .filter(r => r.title.length > 2 && r.url.length > 0);
}
