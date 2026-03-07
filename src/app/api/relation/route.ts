import { NextRequest, NextResponse } from 'next/server';
import { findRelationshipPath } from '@/lib/gedcom-store';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';

  if (!from || !to) {
    return NextResponse.json({ error: 'Missing from/to params' }, { status: 400 });
  }

  const path = await findRelationshipPath(from, to);
  return NextResponse.json({ path });
}
