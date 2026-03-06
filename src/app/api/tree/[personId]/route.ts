import { NextRequest, NextResponse } from 'next/server';
import { getTreeCentered } from '@/lib/gedcom-store';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ personId: string }> }
) {
  const { personId } = await params;

  try {
    const tree = await getTreeCentered(personId);
    return NextResponse.json(tree);
  } catch (error) {
    console.error('Tree fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch tree' }, { status: 500 });
  }
}
