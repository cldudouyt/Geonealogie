import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/session';
import { loadOverrides } from '@/lib/overrides-store';
import { readState } from '@/lib/state-store';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
export async function GET() {
  await requireRole('admin');
  const [overrides, documents, gedcom] = await Promise.all([loadOverrides(), readState('documents', {}), readFile(path.join(process.cwd(), 'Dudouyt Heredis 2014-Export.ged'), 'utf8')]);
  return NextResponse.json({ format: 'geonealogie-backup-v1', exportedAt: new Date().toISOString(), gedcom, overrides, documents, note: 'Les médias sont référencés par URL ; leurs fichiers binaires ne sont pas inclus.' }, { headers: { 'Content-Disposition': 'attachment; filename="geonealogie-sauvegarde.json"', 'Cache-Control': 'no-store' } });
}
