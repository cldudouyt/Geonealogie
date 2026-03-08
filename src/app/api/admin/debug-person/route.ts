import { getPerson } from '@/lib/gedcom-store';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') || '69';
  const person = await getPerson(id);
  if (!person) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({
    id: person.id,
    displayName: person.displayName,
    notes: person.notes,
    burialPlace: person.burialPlace,
  });
}
