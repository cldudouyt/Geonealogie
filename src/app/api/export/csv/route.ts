import { NextResponse } from 'next/server';
import { getAllPersons, isPresumedAlive } from '@/lib/gedcom-store';

import { csvCell as esc } from '@/lib/csv';

export async function GET() {
  const persons = await getAllPersons();

  const header = [
    'ID', 'Prénom(s)', 'Nom', 'Nom affiché', 'Sexe',
    'Naissance (date)', 'Naissance (année)', 'Naissance (lieu)',
    'Décès (date)', 'Décès (année)', 'Décès (lieu)',
    'Inhumation (date)', 'Inhumation (lieu)',
    'Profession', 'Nationalité', 'Adopté(e)', 'Notes',
  ].join(',');

  const rows = persons.map(p => {
    const alive = isPresumedAlive(p);
    return [
      esc(p.id),
      esc(p.givenNames),
      esc(p.surname),
      esc(p.displayName),
      esc(p.sex),
      alive ? '' : esc(p.birthDateRaw),
      alive ? '' : esc(p.birthYear),
      alive ? '' : esc(p.birthPlaceFull || p.birthPlace),
      alive ? '' : esc(p.deathDateRaw),
      alive ? '' : esc(p.deathYear),
      alive ? '' : esc(p.deathPlaceFull || p.deathPlace),
      alive ? '' : esc(p.burialDateRaw),
      alive ? '' : esc(p.burialPlace),
      alive ? '' : esc(p.occupation),
      alive ? '' : esc(p.nationality),
      p.isAdopted ? 'Oui' : 'Non',
      alive ? '' : esc(p.notes),
    ].join(',');
  });

  const csv = [header, ...rows].join('\r\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="genealogie.csv"',
    },
  });
}
