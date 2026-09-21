import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/session';
import { getPerson } from '@/lib/gedcom-store';
import { isLegacyBlob } from '@/lib/document-privacy';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
export async function GET(req: NextRequest) {
  await requireRole('admin');
  const photo = (await getPerson(req.nextUrl.searchParams.get('id') || ''))?.photoUrl;
  if (!photo) return NextResponse.json({ error: 'Photo introuvable.' }, { status: 404 });
  if (isLegacyBlob(photo)) {
    const res = await fetch(photo, { redirect: 'error', signal: AbortSignal.timeout(15000) });
    if (!res.ok) return NextResponse.json({ error: 'Photo inaccessible.' }, { status: 502 });
    return new NextResponse(res.body, { headers: { 'Content-Type': res.headers.get('content-type') || 'application/octet-stream', 'Cache-Control': 'no-store' } });
  }
  if (photo.startsWith('/') && !photo.startsWith('//')) {
    const root = path.resolve('public');
    const file = path.resolve(root, '.' + photo);
    if (file.startsWith(root + path.sep)) {
      try { return new NextResponse(await readFile(file), { headers: { 'Cache-Control': 'no-store' } }); } catch { /* missing media is reported below */ }
    }
  }
  return NextResponse.json({ error: 'Photo externe : sauvegarde manuelle nécessaire.' }, { status: 422 });
}
