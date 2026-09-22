import { NextRequest, NextResponse } from 'next/server';
import { runAgentsInParallel, streamAgentResponse, GENEALOGY_SYSTEM_PROMPT } from '@/lib/ai';
import { parseAIRequest, boundedJSON } from '@/lib/ai-request';
import { requireRole } from '@/lib/session';
import { consumeLimit, limitKey } from '@/lib/request-limits';
export const maxDuration = 60;
export async function POST(req: NextRequest) {
  const session = await requireRole('contributor');
  let input;
  try { input = parseAIRequest(await boundedJSON(req)); }
  catch { return NextResponse.json({ error: 'JSON invalide ou corps supérieur à 32 Ko.' }, { status: 400 }); }
  if (!input) return NextResponse.json({ error: 'Requête invalide : message limité à 8 000 caractères, 1 à 3 tâches distinctes.' }, { status: 400 });
  try {
    if (!await consumeLimit(limitKey('ai', session.credential), 10, 60_000, input.mode === 'parallel' ? input.tasks.length : 1)) return NextResponse.json({ error: 'Limite atteinte. Réessayez dans une minute.' }, { status: 429, headers: { 'Retry-After': '60' } });
  } catch { return NextResponse.json({ error: 'Service temporairement indisponible.' }, { status: 503 }); }
  const abort = new AbortController();
  const signal = AbortSignal.any([req.signal, AbortSignal.timeout(45000), abort.signal]);
  try {
    if (input.mode === 'parallel') {
      const results = await runAgentsInParallel(input.tasks, undefined, signal);
      return NextResponse.json({ results }, { status: results.every(r => r.error) ? 502 : 200 });
    }
    const stream = await streamAgentResponse(GENEALOGY_SYSTEM_PROMPT, input.message, undefined, signal);
    const iterator = stream[Symbol.asyncIterator]();
    // Read the first event before returning HTTP 200 so provider failures have a proper status.
    let first = await iterator.next();
    const encoder = new TextEncoder();
    return new Response(new ReadableStream({
      async pull(controller) {
        try {
          while (!first.done) {
            const chunk = first.value;
            first = await iterator.next();
            if (chunk.text) { controller.enqueue(encoder.encode(chunk.text)); return; }
          }
          controller.close();
        } catch { abort.abort(); controller.error(new Error('Réponse IA interrompue. Réessayez.')); }
      },
      cancel() { abort.abort(); },
    }), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
  } catch { abort.abort(); return NextResponse.json({ error: 'Le service IA est indisponible ou a dépassé le délai. Réessayez plus tard.' }, { status: 502 }); }
}
