import { NextRequest, NextResponse } from 'next/server';

export interface BnfResult {
  title: string;
  creator: string;
  date: string;
  url: string;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || '';
  if (!q) return NextResponse.json({ results: [] });

  const sruUrl = `https://catalogue.bnf.fr/api/SRU?operation=searchRetrieve&version=1.2&query=bib.anywhere+all+%22${encodeURIComponent(q)}%22&recordSchema=dublincore&maximumRecords=5`;

  try {
    const res = await fetch(sruUrl, {
      headers: { 'User-Agent': 'Geonealogie/1.0' },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return NextResponse.json({ results: [] });

    const xml = await res.text();

    const results: BnfResult[] = [];
    const recordRegex = /<srw:recordData>([\s\S]*?)<\/srw:recordData>/g;
    let recMatch;

    while ((recMatch = recordRegex.exec(xml)) !== null) {
      const block = recMatch[1];

      // Extract dc:identifier that starts with http://catalogue.bnf.fr/
      const urlMatch = block.match(/<dc:identifier>(http:\/\/catalogue\.bnf\.fr\/[^<]+)<\/dc:identifier>/);
      if (!urlMatch) continue;
      const url = urlMatch[1].trim();

      const titleMatch = block.match(/<dc:title>([^<]+)<\/dc:title>/);
      const creatorMatch = block.match(/<dc:creator>([^<]+)<\/dc:creator>/);
      const dateMatch = block.match(/<dc:date>([^<]+)<\/dc:date>/);

      const title = titleMatch ? titleMatch[1].trim() : '';
      const creator = creatorMatch ? creatorMatch[1].replace(/\s*\(.*?\)\..*$/, '').trim() : '';
      const date = dateMatch ? dateMatch[1].trim() : '';

      if (title) results.push({ title, creator, date, url });
      if (results.length >= 3) break;
    }

    return NextResponse.json({ results, searchUrl: sruUrl });
  } catch (e) {
    return NextResponse.json({ results: [], error: String(e) });
  }
}
