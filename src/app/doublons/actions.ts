'use server';
import { revalidatePath } from 'next/cache';
import { getPerson, clearStore, getAllPersons, getDuplicateKinships } from '@/lib/gedcom-store';
import { loadOverrides, deletePerson, mergePerson, ignoreDoublon, type PersonEdit, mergePersonBatch } from '@/lib/overrides-store';
import { requireRole } from '@/lib/session';
import { analyzeDuplicates, pairKey } from '@/lib/duplicate-analysis';
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

export async function analyzeDuplicatesAction() {
  await requireRole('admin');
  const before = await loadOverrides(); clearStore();
  const persons = await getAllPersons();
  const kin = await getDuplicateKinships();
  const after = await loadOverrides();
  if ((before.revision ?? 0) !== (after.revision ?? 0)) throw new Error('Les données ont changé pendant l’analyse. Réessayez.');
  return {...analyzeDuplicates(persons,kin,after.ignoredDoublons), revision: after.revision ?? 0};
}
export async function mergeDuplicatesBatchAction(selected: string[], revision: number) {
  const session = await requireRole('admin');
  if (!Array.isArray(selected) || !selected.length || selected.length > 50 || selected.some(id=>typeof id !== 'string') || new Set(selected).size !== selected.length || !Number.isSafeInteger(revision)) throw new Error('Sélection invalide (50 paires maximum).');
  const analysis = await analyzeDuplicatesAction();
  if (analysis.revision !== revision) throw new Error('Les données ont changé. Relancez l’analyse.');
  const state = await loadOverrides();
  if ((state.revision ?? 0) !== revision) throw new Error('Les données ont changé. Relancez l’analyse.');
  const operations = selected.map(key => {
    const pair = analysis.pairs.find(p=>p.eligible && pairKey(p.a.id,p.b.id) === key);
    if (!pair) throw new Error('Une paire n’est plus admissible. Relancez l’analyse.');
    const {a,b} = pair;
    const edit: Record<string, unknown> = {};
    for (const field of Object.keys(MERGE_FIELDS) as MergeField[]) {
      const value = a[field] === '' || a[field] == null ? b[field] : a[field];
      if (value !== undefined) edit[field] = value;
    }
    if (a.notes && b.notes && a.notes !== b.notes) edit.notes = `${a.notes}\n\n${b.notes}`;
    edit.events = Array.from(new Map([...a.events,...b.events].map(e=>[JSON.stringify(e),e])).values());
    const sourcesFor = (id: string) => (state.newPersons.find(p=>p.id === id) ?? state.persons[id])?.sources ?? [];
    edit.sources = [...sourcesFor(a.id),...sourcesFor(b.id)];
    return {keepId:a.id,deleteId:b.id,edit:edit as PersonEdit};
  });
  await mergePersonBatch(operations,session.name,revision);
  clearStore(); revalidatePath('/', 'layout');
  return {count:operations.length};
}
