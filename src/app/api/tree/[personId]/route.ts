import { NextRequest, NextResponse } from 'next/server';
import { getTreeCentered } from '@/lib/gedcom-store';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ personId: string }> }
) {
  const { personId } = await params;
  const genParam = parseInt(request.nextUrl.searchParams.get('generations') ?? '', 10);
  const generations = Number.isFinite(genParam) ? Math.min(Math.max(genParam, 1), 8) : 4;

  try {
    const tree = await getTreeCentered(personId, generations);
    return NextResponse.json(tree);
  } catch (error) {
    console.error('Tree fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch tree' }, { status: 500 });
  }
}
