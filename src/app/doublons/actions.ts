'use server';

import { revalidatePath } from 'next/cache';
import { getAllPersons, clearStore } from '@/lib/gedcom-store';
import { savePersonEdit, deletePerson, mergePerson, ignoreDoublon, type PersonEdit } from '@/lib/overrides-store';
import { runQuery } from '@/lib/neo4j';

// ─── Existing actions (GEDCOM / overrides-store based) ────────────────────────

export async function mergePersonsAction(keepId: string, deleteId: string): Promise<void> {
  const persons = await getAllPersons();
  const keep = persons.find(p => p.id === keepId);
  const del  = persons.find(p => p.id === deleteId);
  if (!keep || !del) return;

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

// ─── Neo4j-backed actions ─────────────────────────────────────────────────────

/**
 * Fusionne deux nœuds Person dans Neo4j.
 * Conserve le nœud avec le plus de propriétés renseignées, transfère les
 * propriétés manquantes, transfère les relations CHILD_OF et SPOUSE_OF,
 * puis supprime le nœud source.
 */
export async function mergePersons(idA: string, idB: string): Promise<void> {
  type CountRow = { idA: string; countA: number; idB: string; countB: number };
  const rows = await runQuery<CountRow>(
    `
    MATCH (a:Person {id: $idA}), (b:Person {id: $idB})
    RETURN
      a.id AS idA,
      size([k IN keys(a) WHERE a[k] IS NOT NULL AND a[k] <> '']) AS countA,
      b.id AS idB,
      size([k IN keys(b) WHERE b[k] IS NOT NULL AND b[k] <> '']) AS countB
    `,
    { idA, idB },
  ).catch(() => [] as CountRow[]);

  if (rows.length === 0) {
    // Pas de nœud Neo4j — fallback overrides-store
    await mergePersonsAction(idA, idB);
    return;
  }

  const { countA, countB } = rows[0];
  const keepId   = countA >= countB ? idA : idB;
  const deleteId = keepId === idA   ? idB : idA;

  // Copier les propriétés manquantes, transférer les relations, supprimer le doublon
  await runQuery(
    `
    MATCH (keep:Person {id: $keepId}), (del:Person {id: $deleteId})
    SET keep.birthDateRaw = coalesce(keep.birthDateRaw,  del.birthDateRaw),
        keep.birthPlace   = coalesce(keep.birthPlace,    del.birthPlace),
        keep.deathDateRaw = coalesce(keep.deathDateRaw,  del.deathDateRaw),
        keep.deathPlace   = coalesce(keep.deathPlace,    del.deathPlace),
        keep.occupation   = coalesce(keep.occupation,    del.occupation),
        keep.nationality  = coalesce(keep.nationality,   del.nationality),
        keep.notes        = coalesce(keep.notes,         del.notes)
    WITH keep, del
    // Relations CHILD_OF sortantes : del -[CHILD_OF]-> parent => keep -[CHILD_OF]-> parent
    OPTIONAL MATCH (del)-[:CHILD_OF]->(parent:Person)
    WHERE parent.id <> $keepId
    WITH keep, del, collect(parent) AS parents
    FOREACH (p IN parents | MERGE (keep)-[:CHILD_OF]->(p))
    WITH keep, del
    // Relations CHILD_OF entrantes : child -[CHILD_OF]-> del => child -[CHILD_OF]-> keep
    OPTIONAL MATCH (child:Person)-[:CHILD_OF]->(del)
    WHERE child.id <> $keepId
    WITH keep, del, collect(child) AS children
    FOREACH (c IN children | MERGE (c)-[:CHILD_OF]->(keep))
    WITH keep, del
    // Relations SPOUSE_OF : del -[SPOUSE_OF]- spouse => keep -[SPOUSE_OF]- spouse
    OPTIONAL MATCH (del)-[:SPOUSE_OF]-(spouse:Person)
    WHERE spouse.id <> $keepId
    WITH keep, del, collect(spouse) AS spouses
    FOREACH (s IN spouses | MERGE (keep)-[:SPOUSE_OF]-(s))
    WITH keep, del
    DETACH DELETE del
    `,
    { keepId, deleteId },
  ).catch((err: unknown) => {
    console.error('[mergePersons] Neo4j merge failed:', err);
  });

  revalidatePath('/doublons');
}

/**
 * Crée une relation KNOWN_NOT_DUPLICATE entre deux nœuds Person dans Neo4j.
 * Ces paires ne réapparaissent plus dans la liste.
 */
export async function ignorePair(idA: string, idB: string): Promise<void> {
  await runQuery(
    `
    MATCH (a:Person {id: $idA}), (b:Person {id: $idB})
    MERGE (a)-[:KNOWN_NOT_DUPLICATE]-(b)
    `,
    { idA, idB },
  ).catch((err: unknown) => {
    console.error('[ignorePair] Neo4j query failed:', err);
  });

  // Persister aussi dans overrides pour la détection côté GEDCOM
  await ignoreDoublon(idA, idB);
  revalidatePath('/doublons');
}
