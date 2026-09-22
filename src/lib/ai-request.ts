import type { AgentTask } from './ai';
export type AIRequest = { mode: 'chat'; message: string } | { mode: 'parallel'; tasks: AgentTask[] };
export function parseAIRequest(value: unknown): AIRequest | null {
  if (!value || typeof value !== 'object') return null;
  const body = value as Record<string, unknown>;
  const text = (s: unknown, max: number): s is string => typeof s === 'string' && s.trim().length > 0 && s.length <= max;
  if (body.mode === 'chat' && text(body.message, 8000)) return { mode: 'chat', message: body.message };
  if (body.mode !== 'parallel' || !Array.isArray(body.tasks) || body.tasks.length < 1 || body.tasks.length > 3) return null;
  const tasks: AgentTask[] = [];
  for (const value of body.tasks) {
    if (!value || typeof value !== 'object') return null;
    const task = value as Record<string, unknown>;
    if (!text(task.name, 80) || !text(task.systemPrompt, 2000) || !text(task.userMessage, 8000)) return null;
    tasks.push({ name: task.name, systemPrompt: task.systemPrompt, userMessage: task.userMessage });
  }
  if (new Set(tasks.map(t => t.name)).size !== tasks.length) return null;
  return { mode: 'parallel', tasks };
}
export async function boundedJSON(request: Request, maxBytes = 32768): Promise<unknown> {
  if (!request.body) throw new Error('Corps manquant');
  const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new Error('Corps trop volumineux'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
