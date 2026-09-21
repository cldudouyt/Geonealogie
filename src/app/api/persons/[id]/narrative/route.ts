import { NextRequest, NextResponse } from 'next/server';
import { getPerson } from '@/lib/gedcom-store';
import { getNarrative, updateNarrative } from '@/lib/narratives-store';
import { narrativeFacts, narrativeFingerprint } from '@/lib/narrative-facts';
import { loadOverrides } from '@/lib/overrides-store';
import { requireRole } from '@/lib/session';
import { anthropic, DEFAULT_MODEL } from '@/lib/ai';

type Context = { params: Promise<{ id: string }> };
async function context(id: string) {
  const person = await getPerson(id);
  if (!person) throw new Error('Personne introuvable');
  const overrides = await loadOverrides();
  const sources = (overrides.newPersons.find(p => p.id === id) ?? overrides.persons[id])?.sources ?? [];
  return { person, fingerprint: narrativeFingerprint(person, sources), facts: narrativeFacts(person) };
}
export async function POST(_req: NextRequest, { params }: Context) {
  await requireRole('contributor');
  const { id } = await params;
  const { person, fingerprint, facts } = await context(id);
  if (!person.deathDateRaw && !person.deathYear) return NextResponse.json({ error: 'Pour préserver les personnes dont le décès n’est pas renseigné, rédigez ce portrait manuellement.' }, { status: 400 });
  const previous = await getNarrative(id);
  if (previous && Date.now() - Date.parse(previous.generatedAt) < 60_000) return NextResponse.json({ error: 'Patientez une minute avant de régénérer.' }, { status: 429 });
  let text: string;
  try {
    const message = await anthropic.messages.create({
      model: DEFAULT_MODEL, max_tokens: 500,
      system: 'Rédige un court portrait biographique en français. Utilise exclusivement les faits fournis. N’invente rien, ne complète aucune lacune. Adapte la longueur au nombre de faits. Texte simple sans Markdown.',
      messages: [{ role: 'user', content: JSON.stringify(facts) }],
    });
    text = message.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
  } catch { return NextResponse.json({ error: 'Génération indisponible. Réessayez plus tard ou rédigez le portrait manuellement.' }, { status: 502 }); }
  if (!text) return NextResponse.json({ error: 'Aucun texte reçu.' }, { status: 502 });
  try {
    const current = await context(id);
    if (current.fingerprint !== fingerprint) throw new Error('La fiche a changé pendant la génération. Réessayez.');
    const entry = { text, generatedAt: new Date().toISOString(), fingerprint, facts, revision: (previous?.revision ?? 0) + 1 };
    await updateNarrative(id, entry, previous?.revision ?? 0);
    return NextResponse.json(entry);
  } catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 409 }); }
}
export async function PATCH(req: NextRequest, { params }: Context) {
  const session = await requireRole('contributor');
  const { id } = await params;
  try {
    const body = await req.json();
    if (typeof body.text !== 'string' || !body.text.trim() || body.text.length > 10000 || !Number.isInteger(body.revision)) return NextResponse.json({ error: 'Texte requis, limité à 10 000 caractères.' }, { status: 400 });
    const { fingerprint, facts } = await context(id);
    if (body.fingerprint !== fingerprint) throw new Error('La fiche a changé. Rechargez avant de valider.');
    const entry = { text: body.text.trim(), generatedAt: new Date().toISOString(), fingerprint, facts, reviewedAt: new Date().toISOString(), reviewedBy: session.name, revision: body.revision + 1 };
    await updateNarrative(id, entry, body.revision);
    return NextResponse.json(entry);
  } catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 409 }); }
}
