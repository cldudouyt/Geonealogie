import { readState, mutateState } from './state-store';

export interface NarrativeEntry {
  text: string;
  generatedAt: string;
  fingerprint?: string;
  facts?: unknown;
  reviewedAt?: string;
  reviewedBy?: string;
  revision?: number;
}

const DB_KEY = 'narratives';

export async function getNarrative(personId: string): Promise<NarrativeEntry | null> {
  const all = await readState<Record<string, NarrativeEntry>>(DB_KEY, {});
  return all[personId] ?? null;
}

export async function saveNarrative(personId: string, entry: NarrativeEntry): Promise<void> {
  await mutateState<Record<string, NarrativeEntry>, void>(DB_KEY, {}, all => { all[personId] = entry; });
}

export async function updateNarrative(personId: string, entry: NarrativeEntry, expectedRevision: number): Promise<void> {
  await mutateState<Record<string, NarrativeEntry>, void>(DB_KEY, {}, all => {
    if ((all[personId]?.revision ?? 0) !== expectedRevision) throw new Error('Ce portrait a changé. Rechargez la fiche.');
    all[personId] = { ...entry, revision: expectedRevision + 1 };
  });
}
