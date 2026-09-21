import { NextRequest, NextResponse } from 'next/server';
import {
  getPerson, getParents, getChildren, getSpouses, getSiblings,
  formatPlaceFull, isPresumedAlive,
} from '@/lib/gedcom-store';
import { saveNarrative } from '@/lib/narratives-store';
import { anthropic, DEFAULT_MODEL } from '@/lib/ai';

const SYSTEM_PROMPT = `Tu écris un portrait biographique court, en français, pour une application généalogique familiale privée.

Règles strictes :
- N'utilise que les faits fournis dans le message. N'invente jamais une date, un lieu, un lien de parenté ou un événement absent des données.
- Si une information est incertaine ou manquante, n'en parle pas plutôt que de l'inventer ou de la deviner.
- Ton chaleureux et sobre, à la troisième personne, entre 120 et 200 mots.
- Aucune mise en forme (pas de Markdown, pas de titres, pas de listes) — un texte continu en un ou deux paragraphes.
- Si le champ "birth" ne contient qu'une année (personne probablement vivante), reste vague sur la date exacte de naissance.`;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const person = await getPerson(id);
  if (!person) {
    return NextResponse.json({ error: 'Personne introuvable' }, { status: 404 });
  }

  const [parents, children, spouses, siblings] = await Promise.all([
    getParents(id), getChildren(id), getSpouses(id), getSiblings(id),
  ]);

  const alive = isPresumedAlive(person);

  const payload = {
    displayName: person.displayName,
    sex: person.sex,
    birth: alive
      ? { year: person.birthYear }
      : { dateRaw: person.birthDateRaw, place: formatPlaceFull(person.birthPlaceFull) || person.birthPlace },
    death: (person.deathDateRaw || person.deathYear)
      ? { dateRaw: person.deathDateRaw, place: formatPlaceFull(person.deathPlaceFull) || person.deathPlace }
      : undefined,
    occupations: person.occupations,
    notes: person.notes,
    events: person.events.map(e => ({ type: e.type, dateRaw: e.dateRaw, place: e.place, note: e.note })),
    parents: parents.map(p => p.displayName),
    spouses: spouses.filter(s => s.person).map(s => ({ name: s.person!.displayName, marriageDateRaw: s.marriageDateRaw })),
    children: children.map(c => c.displayName),
    siblings: siblings.map(s => s.displayName),
  };

  let text: string;
  try {
    const message = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: JSON.stringify(payload) }],
    });
    text = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
  } catch (error) {
    return NextResponse.json({ error: 'Génération indisponible : ' + (error as Error).message }, { status: 502 });
  }

  if (!text) {
    return NextResponse.json({ error: 'La génération a renvoyé un texte vide' }, { status: 502 });
  }

  const entry = { text, generatedAt: new Date().toISOString() };
  await saveNarrative(id, entry);

  return NextResponse.json(entry, { status: 201 });
}
