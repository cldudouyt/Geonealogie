import { NextRequest, NextResponse } from 'next/server';
import { findRelationshipPath, getStore } from '@/lib/gedcom-store';

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

function computeRelationshipTitle(path: Array<{ relation: string; sex: string }>): string {
  if (path.length === 0) return 'même personne';
  if (path.length === 1) {
    const rel = path[0].relation;
    const sex = path[0].sex;
    if (rel === 'parent') return sex === 'F' ? 'mère' : 'père';
    if (rel === 'enfant') return sex === 'F' ? 'fille' : 'fils';
    if (rel === 'conjoint') return 'conjoint(e)';
  }
  if (path.length === 2) {
    const [r1, r2] = path;
    if (r1.relation === 'parent' && r2.relation === 'parent') {
      return r2.sex === 'F' ? 'grand-mère' : 'grand-père';
    }
    if (r1.relation === 'enfant' && r2.relation === 'enfant') {
      return r2.sex === 'F' ? 'petite-fille' : 'petit-fils';
    }
    if ((r1.relation === 'parent' && r2.relation === 'enfant') ||
        (r1.relation === 'enfant' && r2.relation === 'parent')) {
      return r2.sex === 'F' ? 'sœur' : 'frère';
    }
    if (r1.relation === 'conjoint' && r2.relation === 'parent') {
      return r2.sex === 'F' ? 'belle-mère' : 'beau-père';
    }
    if (r1.relation === 'conjoint' && r2.relation === 'enfant') {
      return r2.sex === 'F' ? 'belle-fille' : 'beau-fils';
    }
    if (r1.relation === 'parent' && r2.relation === 'conjoint') {
      return r2.sex === 'F' ? 'belle-mère' : 'beau-père';
    }
    if (r1.relation === 'enfant' && r2.relation === 'conjoint') {
      return r2.sex === 'F' ? 'belle-fille' : 'beau-fils';
    }
  }
  if (path.length === 3) {
    const [r1, r2, r3] = path;
    if (r1.relation === 'parent' && r2.relation === 'parent' && r3.relation === 'parent') {
      return r3.sex === 'F' ? 'arrière-grand-mère' : 'arrière-grand-père';
    }
    if (r1.relation === 'parent' && r2.relation === 'parent' && r3.relation === 'enfant') {
      return r3.sex === 'F' ? 'tante' : 'oncle';
    }
    if (r1.relation === 'enfant' && r2.relation === 'enfant' && r3.relation === 'enfant') {
      return r3.sex === 'F' ? 'arrière-petite-fille' : 'arrière-petit-fils';
    }
    if (r1.relation === 'enfant' && r2.relation === 'enfant' && r3.relation === 'parent') {
      return r3.sex === 'F' ? 'nièce' : 'neveu';
    }
    if (r1.relation === 'parent' && r2.relation === 'enfant' && r3.relation === 'enfant') {
      return r3.sex === 'F' ? 'nièce' : 'neveu';
    }
    if (r1.relation === 'parent' && r2.relation === 'parent' && r3.relation === 'conjoint') {
      return r3.sex === 'F' ? 'grand-tante' : 'grand-oncle';
    }
  }
  if (path.length === 4) {
    const [r1, r2, r3, r4] = path;
    if (r1.relation === 'parent' && r2.relation === 'parent' &&
        r3.relation === 'enfant' && r4.relation === 'enfant') {
      return r4.sex === 'F' ? 'cousine germaine' : 'cousin germain';
    }
    if (r1.relation === 'parent' && r2.relation === 'parent' &&
        r3.relation === 'parent' && r4.relation === 'enfant') {
      return r4.sex === 'F' ? 'grand-tante' : 'grand-oncle';
    }
    if (r1.relation === 'enfant' && r2.relation === 'enfant' &&
        r3.relation === 'parent' && r4.relation === 'parent') {
      return r4.sex === 'F' ? 'grand-tante' : 'grand-oncle';
    }
  }

  const degree = path.length;
  const last = path[path.length - 1];
  const genSuffix = last.sex === 'F' ? 'féminin' : last.sex === 'M' ? 'masculin' : 'neutre';
  return `relation au ${degree}e degré (${genSuffix})`;
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

  const relationship = computeRelationshipTitle(pathRelations);
  const degree = rawPath.length - 1;

  return NextResponse.json({ path: enrichedPath, relationship, degree });
}
