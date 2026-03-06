import { NextRequest, NextResponse } from 'next/server';
import { getPerson, getParents, getChildren, getSpouses, getSiblings } from '@/lib/gedcom-store';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const person = getPerson(id);
    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }

    return NextResponse.json({
      person,
      parents: getParents(id),
      children: getChildren(id),
      spouses: getSpouses(id),
      siblings: getSiblings(id),
    });
  } catch (error) {
    console.error('Person fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch person' }, { status: 500 });
  }
}
