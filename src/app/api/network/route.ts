import { NextResponse } from 'next/server';
import { getStore, getAllPersons } from '@/lib/gedcom-store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const focusId = searchParams.get('focus');

  if (focusId) {
    return getFocusNetwork(focusId);
  }
  return getFullNetwork();
}

async function getFocusNetwork(focusId: string) {
  const store = await getStore();
  const focus = store.persons.get(focusId);
  if (!focus) {
    return NextResponse.json({ error: 'Person not found' }, { status: 404 });
  }

  const nodes: { id: string; name: string; relation: string; sex: 'M' | 'F' | 'C'; r: number }[] = [];
  const edges: { source: string; target: string }[] = [];
  const seen = new Set<string>();

  nodes.push({ id: focusId, name: focus.displayName, relation: '', sex: 'C', r: 42 });
  seen.add(focusId);

  const addRelated = (personId: string, relation: string) => {
    if (seen.has(personId)) return;
    const p = store.persons.get(personId);
    if (!p) return;
    seen.add(personId);
    const sex: 'M' | 'F' = p.sex === 'F' ? 'F' : 'M';
    nodes.push({ id: personId, name: p.displayName, relation, sex, r: 32 });
    edges.push({ source: focusId, target: personId });
  };

  const spouseRels = store.spouseRelations.get(focusId) || [];
  for (const rel of spouseRels) {
    addRelated(rel.spouseId, 'Conjoint(e)');
  }

  const parentIds = store.childToParents.get(focusId) || [];
  for (const pid of parentIds) {
    const p = store.persons.get(pid);
    if (!p) continue;
    addRelated(pid, p.sex === 'F' ? 'Mère' : 'Père');
  }

  const childIds = store.parentToChildren.get(focusId) || [];
  for (const cid of childIds) {
    addRelated(cid, 'Enfant');
  }

  for (const pid of parentIds) {
    const siblings = store.parentToChildren.get(pid) || [];
    for (const sib of siblings) {
      if (sib !== focusId) {
        addRelated(sib, 'Frère/Sœur');
      }
    }
  }

  return NextResponse.json({ nodes, edges });
}

async function getFullNetwork() {
  const [persons, store] = await Promise.all([getAllPersons(), getStore()]);

  const nodes = persons.map(p => ({
    id: p.id,
    name: p.displayName,
    sex: p.sex,
    birthYear: p.birthYear ? parseInt(p.birthYear) : null,
    surname: p.surname,
  }));

  const links: { source: string; target: string; type: 'spouse' | 'parent' }[] = [];
  for (const fam of store.families.values()) {
    const { husbandId, wifeId, childrenIds } = fam;
    if (husbandId && wifeId) {
      links.push({ source: husbandId, target: wifeId, type: 'spouse' });
    }
    for (const childId of childrenIds) {
      if (husbandId) links.push({ source: husbandId, target: childId, type: 'parent' });
      if (wifeId) links.push({ source: wifeId, target: childId, type: 'parent' });
    }
  }

  return NextResponse.json({ nodes, links });
}
