import { readState, mutateState } from './state-store';

export interface NarrativeEntry {
  text: string;
  generatedAt: string;
}

const DB_KEY = 'narratives';

export async function getNarrative(personId: string): Promise<NarrativeEntry | null> {
  const all = await readState<Record<string, NarrativeEntry>>(DB_KEY, {});
  return all[personId] ?? null;
}

export async function saveNarrative(personId: string, entry: NarrativeEntry): Promise<void> {
  await mutateState<Record<string, NarrativeEntry>, void>(DB_KEY, {}, all => { all[personId] = entry; });
}
