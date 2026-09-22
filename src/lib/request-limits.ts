import { createHmac } from 'node:crypto';
import { mutateState } from './state-store';
interface Bucket { count: number; until: number }
export function limitKey(scope: string, identity: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('Accès non configuré.');
  return scope + ':' + createHmac('sha256', secret).update(identity).digest('hex');
}
export async function consumeLimit(key: string, maximum: number, windowMs: number, cost = 1, now = Date.now()): Promise<boolean> {
  return mutateState<Record<string, Bucket>, boolean>('request-limits', {}, state => {
    for (const [id, bucket] of Object.entries(state)) if (bucket.until <= now) delete state[id];
    if (!state[key] && Object.keys(state).length >= 10000) return false;
    const bucket = state[key] ?? { count: 0, until: now + windowMs };
    if (bucket.count + cost > maximum) return false;
    state[key] = { ...bucket, count: bucket.count + cost };
    return true;
  });
}
export async function resetLimit(key: string): Promise<void> {
  await mutateState<Record<string, Bucket>, void>('request-limits', {}, state => { delete state[key]; });
}
