import fs from 'node:fs/promises';
import path from 'node:path';
import { hasDb, kvReadVersion, kvCompareSet } from './db';
export async function readState<T>(key: string, fallback: T): Promise<T> {
  if (hasDb()) { const row = await kvReadVersion<T>(key); if (row) return row.data; }
  try { return JSON.parse(await fs.readFile(path.join(process.env.GEO_DATA_DIR || path.join(process.cwd(), 'data'), `${key}.json`), 'utf8')) as T; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return structuredClone(fallback); throw error; }
}
export async function mutateState<T, R>(key: string, fallback: T, mutate: (state: T) => R): Promise<R> {
  if (hasDb()) {
    return mutateVersioned(
      () => kvReadVersion<T>(key),
      (version, state) => kvCompareSet(key, version, state),
      () => readState(key, fallback), mutate,
    );
  }
  if (process.env.VERCEL) throw new Error('Sauvegarde indisponible : base de données non configurée.');
  const file = path.join(process.env.GEO_DATA_DIR || path.join(process.cwd(), 'data'), `${key}.json`);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const lock = `${file}.lock`;
  let acquired = false;
  for (let i = 0; i < 100; i++) {
    try { await fs.mkdir(lock); acquired = true; break; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; await new Promise(r => setTimeout(r, 25)); }
  }
  if (!acquired) throw new Error('Sauvegarde occupée. Réessayez dans un instant.');
  const temp = `${file}.${crypto.randomUUID()}.tmp`;
  try {
    const state = await readState(key, fallback);
    const result = mutate(state);
    await fs.writeFile(temp, JSON.stringify(state, null, 2));
    await fs.rename(temp, file);
    return result;
  } finally { await fs.rm(temp, { force: true }); await fs.rmdir(lock); }
}

export async function mutateVersioned<T, R>(
  read: () => Promise<{ data: T; version: number } | null>,
  compareSet: (version: number | null, state: T) => Promise<boolean>,
  initial: () => Promise<T>, mutate: (state: T) => R,
): Promise<R> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const row = await read();
    const state = row?.data ?? await initial();
    const result = mutate(state);
    if (await compareSet(row?.version ?? null, state)) return result;
  }
  throw new Error('Une autre modification est en cours. Rechargez la page avant de réessayer.');
}
