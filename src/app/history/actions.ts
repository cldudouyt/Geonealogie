'use server';
import { requireRole } from '@/lib/session';
import { restoreLatest } from '@/lib/overrides-store';
import { clearStore } from '@/lib/gedcom-store';
import { revalidatePath } from 'next/cache';
export async function restoreAction(_state: { error?: string; success?: boolean } | null, form: FormData) {
  const session = await requireRole('admin');
  try { await restoreLatest(String(form.get('entryId')), session.name); clearStore(); revalidatePath('/', 'layout'); return { success: true }; }
  catch (error) { return { error: error instanceof Error ? error.message : 'Restauration impossible.' }; }
}
