'use server';

import { revalidatePath } from 'next/cache';
import { getAllPersons, clearStore } from '@/lib/gedcom-store';
import { savePersonEdit, deletePerson, mergePerson, ignoreDoublon, type PersonEdit } from '@/lib/overrides-store';

export async function mergePersonsAction(keepId: string, deleteId: string): Promise<void> {
  const persons = await getAllPersons();
  const keep = persons.find(p => p.id === keepId);
  const del  = persons.find(p => p.id === deleteId);
  if (!keep || !del) return;

  // Copy non-empty fields from deleted person that the kept person lacks
  const transfer: PersonEdit = {};
  if (!keep.birthDateRaw  && del.birthDateRaw)  transfer.birthDateRaw  = del.birthDateRaw;
  if (!keep.birthPlace    && del.birthPlace)    transfer.birthPlace    = del.birthPlace;
  if (!keep.birthPlaceFull && del.birthPlaceFull) transfer.birthPlaceFull = del.birthPlaceFull;
  if (!keep.deathDateRaw  && del.deathDateRaw)  transfer.deathDateRaw  = del.deathDateRaw;
  if (!keep.deathPlace    && del.deathPlace)    transfer.deathPlace    = del.deathPlace;
  if (!keep.deathPlaceFull && del.deathPlaceFull) transfer.deathPlaceFull = del.deathPlaceFull;
  if (!keep.burialDateRaw && del.burialDateRaw) transfer.burialDateRaw = del.burialDateRaw;
  if (!keep.burialPlace   && del.burialPlace)   transfer.burialPlace   = del.burialPlace;
  if (!keep.chrDateRaw    && del.chrDateRaw)    transfer.chrDateRaw    = del.chrDateRaw;
  if (!keep.chrPlace      && del.chrPlace)      transfer.chrPlace      = del.chrPlace;
  if (!keep.occupation    && del.occupation)    transfer.occupation    = del.occupation;
  if (!keep.nationality   && del.nationality)   transfer.nationality   = del.nationality;
  if (!keep.nickname      && del.nickname)      transfer.nickname      = del.nickname;
  if (!keep.notes && del.notes) transfer.notes = del.notes;
  else if (keep.notes && del.notes && del.notes !== keep.notes) {
    transfer.notes = `${keep.notes}\n\n[Fusionné]\n${del.notes}`;
  }

  if (Object.keys(transfer).length > 0) {
    await savePersonEdit(keepId, transfer);
  }

  await mergePerson(keepId, deleteId);
  clearStore();
  revalidatePath('/doublons');
}

export async function deletePersonAction(id: string): Promise<void> {
  await deletePerson(id);
  clearStore();
  revalidatePath('/doublons');
}

export async function ignoreDoublonAction(idA: string, idB: string): Promise<void> {
  await ignoreDoublon(idA, idB);
  revalidatePath('/doublons');
}
