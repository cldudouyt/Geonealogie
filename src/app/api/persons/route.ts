import { NextRequest, NextResponse } from 'next/server';
import { getAllPersons, searchPersons } from '@/lib/gedcom-store';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const surname = searchParams.get('surname') || '';
  const place = searchParams.get('place') || '';
  const occupation = searchParams.get('occupation') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
  const autocomplete = searchParams.get('autocomplete') === 'true';
  const skip = (page - 1) * limit;

  try {
    if (autocomplete && q) {
      return NextResponse.json({ persons: searchPersons(q, limit) });
    }

    if (q) {
      const results = searchPersons(q, 500);
      return NextResponse.json({ persons: results.slice(skip, skip + limit), total: results.length, page, limit });
    }

    let results = getAllPersons();
    if (surname) results = results.filter(p => p.surname.toLowerCase().includes(surname.toLowerCase()));
    if (place) results = results.filter(p =>
      p.birthPlaceFull?.toLowerCase().includes(place.toLowerCase()) ||
      p.deathPlaceFull?.toLowerCase().includes(place.toLowerCase())
    );
    if (occupation) results = results.filter(p => p.occupation?.toLowerCase().includes(occupation.toLowerCase()));

    results = results.sort((a, b) => a.surname.localeCompare(b.surname) || a.givenNames.localeCompare(b.givenNames));
    return NextResponse.json({ persons: results.slice(skip, skip + limit), total: results.length, page, limit });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Failed to search persons' }, { status: 500 });
  }
}
