import { clearStore } from '@/lib/gedcom-store';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/session';

export async function POST() {
  await requireRole('admin');
  clearStore();
  return NextResponse.json({ ok: true, message: 'Store cache cleared' });
}
