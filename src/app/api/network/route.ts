import { NextResponse } from 'next/server';
import { getAllPersons, getStore } from '@/lib/gedcom-store';

export async function GET() {
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
