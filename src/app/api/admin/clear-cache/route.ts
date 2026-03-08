import { clearStore } from '@/lib/gedcom-store';
import { NextResponse } from 'next/server';

export async function POST() {
  clearStore();
  return NextResponse.json({ ok: true, message: 'Store cache cleared' });
}
