import { NextRequest, NextResponse } from 'next/server';
import { getPerson, getParents, getChildren, getSpouses, getSiblings } from '@/lib/gedcom-store';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const person = await getPerson(id);
    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }

    return NextResponse.json({
      person,
      parents: await getParents(id),
      children: await getChildren(id),
      spouses: await getSpouses(id),
      siblings: await getSiblings(id),
    });
  } catch (error) {
    console.error('Person fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch person' }, { status: 500 });
  }
}
