import { NextRequest, NextResponse } from 'next/server';
import { findRelationshipPath, getStore } from '@/lib/gedcom-store';
import { computeRelationshipTitle } from '@/lib/relationship-label';

function relLabel(relation: string, fromSex: string): string {
  if (relation === 'parent') {
    return fromSex === 'F' ? 'est la fille de' : fromSex === 'M' ? 'est le fils de' : 'est enfant de';
  }
  if (relation === 'enfant') {
    return fromSex === 'F' ? 'est la mère de' : fromSex === 'M' ? 'est le père de' : 'est parent de';
  }
  if (relation === 'conjoint') return 'est marié(e) avec';
  return 'est relié(e) à';
}


export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';

  if (!from || !to) {
    return NextResponse.json({ error: 'Missing from/to params' }, { status: 400 });
  }

  if (from === to) {
    return NextResponse.json({ samePerson: true, path: [], relationship: 'même personne', degree: 0 });
  }

  const rawPath = await findRelationshipPath(from, to);

  if (!rawPath || rawPath.length === 0) {
    return NextResponse.json({ path: null, relationship: null, degree: null });
  }

  const store = await getStore();

  const enrichedPath = rawPath.map((step, i) => {
    const person = store.persons.get(step.personId);
    const sex = person?.sex ?? 'U';
    const birthYear = person?.birthYear;
    const deathYear = person?.deathYear;
    const photoUrl = person?.photoUrl;

    let relToNext: string | undefined;
    if (i < rawPath.length - 1) {
      const next = rawPath[i + 1];
      relToNext = relLabel(next.relation, sex);
    }

    return {
      id: step.personId,
      name: step.displayName,
      sex,
      birthYear,
      deathYear,
      photoUrl,
      relToNext,
    };
  });

  const pathRelations = rawPath.slice(1).map((step) => {
    const person = store.persons.get(step.personId);
    return { relation: step.relation, sex: person?.sex ?? 'U' };
  });

  const { label: relationship, article } = computeRelationshipTitle(pathRelations);
  const degree = rawPath.length - 1;

  return NextResponse.json({ path: enrichedPath, relationship, article, degree });
}
