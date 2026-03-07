import { NextResponse } from 'next/server';
import { getAllPersons } from '@/lib/gedcom-store';

function esc(val: string | undefined): string {
  if (!val) return '';
  // Escape double-quotes and wrap if needed
  if (val.includes('"') || val.includes(',') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export async function GET() {
  const persons = await getAllPersons();

  const header = [
    'ID', 'Prénom(s)', 'Nom', 'Nom affiché', 'Sexe',
    'Naissance (date)', 'Naissance (année)', 'Naissance (lieu)',
    'Décès (date)', 'Décès (année)', 'Décès (lieu)',
    'Inhumation (date)', 'Inhumation (lieu)',
    'Profession', 'Nationalité', 'Adopté(e)', 'Notes',
  ].join(',');

  const rows = persons.map(p => [
    esc(p.id),
    esc(p.givenNames),
    esc(p.surname),
    esc(p.displayName),
    esc(p.sex),
    esc(p.birthDateRaw),
    esc(p.birthYear),
    esc(p.birthPlaceFull || p.birthPlace),
    esc(p.deathDateRaw),
    esc(p.deathYear),
    esc(p.deathPlaceFull || p.deathPlace),
    esc(p.burialDateRaw),
    esc(p.burialPlace),
    esc(p.occupation),
    esc(p.nationality),
    p.isAdopted ? 'Oui' : 'Non',
    esc(p.notes),
  ].join(','));

  const csv = [header, ...rows].join('\r\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="genealogie.csv"',
    },
  });
}
