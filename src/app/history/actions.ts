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

export async function restorePersonAction(_state: { error?: string; success?: boolean } | null, form: FormData) {
  const session = await requireRole('admin');
  try {
    const { restorePersonHistory } = await import('@/lib/overrides-store');
    const revision = Number(form.get('revision'));
    if (!Number.isInteger(revision) || revision < 0) throw new Error('Version invalide.');
    await restorePersonHistory(String(form.get('entryId')), String(form.get('personId')), session.name, revision);
    clearStore(); revalidatePath('/', 'layout'); return { success: true };
  } catch (error) { return { error: (error as Error).message }; }
}
