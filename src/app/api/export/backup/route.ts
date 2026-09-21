import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/session';
import { loadOverrides } from '@/lib/overrides-store';
import { getAllPersons } from '@/lib/gedcom-store';
import { readState } from '@/lib/state-store';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
export async function GET() {
  await requireRole('admin');
  const [overrides, documents, narratives, gedcom, persons] = await Promise.all([
    loadOverrides(), readState('documents', {}), readState('narratives', {}),
    readFile(process.env.GEDCOM_PATH || path.join(process.cwd(), 'Dudouyt Heredis 2014-Export.ged'), 'utf8'), getAllPersons(),
  ]);
  return NextResponse.json({ format: 'geonealogie-backup-v2-manifest', exportedAt: new Date().toISOString(), gedcom, overrides, documents, narratives, photos: persons.filter(p => p.photoUrl).map(p => ({ personId: p.id, url: p.photoUrl })), note: 'Manifeste seul. Utilisez la sauvegarde avec fichiers dans l’historique pour inclure les médias.' }, { headers: { 'Content-Disposition': 'attachment; filename="geonealogie-manifeste.json"', 'Cache-Control': 'no-store' } });
}
