'use server';
import { revalidatePath } from 'next/cache';
import { getPerson, clearStore } from '@/lib/gedcom-store';
import { loadOverrides, deletePerson, mergePerson, ignoreDoublon, type PersonEdit } from '@/lib/overrides-store';
import { requireRole } from '@/lib/session';
import { MERGE_FIELDS, type MergeField } from '@/lib/merge-fields';
export async function previewMerge(aId: string, bId: string) {
  await requireRole('admin'); clearStore();
  const state = await loadOverrides();
  const [a,b] = await Promise.all([getPerson(aId), getPerson(bId)]);
  if (!a || !b || a.id === b.id) throw new Error('Ces fiches ne peuvent pas être comparées.');
  return { a, b, revision: state.revision ?? 0 };
}
export async function mergePersonsAction(keepId: string, deleteId: string, choices: Partial<Record<MergeField, 'keep' | 'other'>> = {}, revision?: number): Promise<void> {
  const session = await requireRole('admin');
  if (revision === undefined) throw new Error('Ouvrez la comparaison avant de fusionner.');
  clearStore();
  const state = await loadOverrides();
  const [keep, other] = await Promise.all([getPerson(keepId), getPerson(deleteId)]);
  if (!keep || !other) throw new Error('Fiche introuvable.');
  const edit: Record<string, unknown> = {};
  for (const key of Object.keys(MERGE_FIELDS) as MergeField[]) {
    edit[key] = choices[key] === 'other' ? other[key] : (keep[key] ?? other[key]);
    if (edit[key] === undefined) delete edit[key];
  }
  if (!choices.notes && keep.notes && other.notes && keep.notes !== other.notes) edit.notes = `${keep.notes}\n\n${other.notes}`;
  edit.events = Array.from(new Map([...keep.events, ...other.events].map(e => [JSON.stringify(e), e])).values());
  const sourcesFor = (id: string) => (state.newPersons.find(p => p.id === id) ?? state.persons[id])?.sources ?? [];
  edit.sources = [...sourcesFor(keepId), ...sourcesFor(deleteId)];
  await mergePerson(keepId, deleteId, edit as PersonEdit, session.name, revision);
  clearStore(); revalidatePath('/', 'layout');
}
export async function deletePersonAction(id: string): Promise<void> { const session = await requireRole('admin'); await deletePerson(id, session.name); clearStore(); revalidatePath('/', 'layout'); }
export async function ignoreDoublonAction(a: string, b: string): Promise<void> { const session = await requireRole('admin'); await ignoreDoublon(a, b, session.name); revalidatePath('/doublons'); }
