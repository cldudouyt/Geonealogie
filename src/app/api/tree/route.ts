import { NextResponse } from 'next/server';
import { getFullTree } from '@/lib/gedcom-store';

export async function GET() {
  try {
    const tree = getFullTree();
    return NextResponse.json(tree);
  } catch (error) {
    console.error('Full tree fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch full tree' }, { status: 500 });
  }
}
