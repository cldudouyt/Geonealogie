import Link from 'next/link';
import { getAllPersons } from '@/lib/gedcom-store';
import { loadOverrides } from '@/lib/overrides-store';
import PairCard from './PairCard';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PersonInfo {
  id: string;
  displayName: string;
  birthYear?: string;
  birthPlace?: string;
  sex: string;
}

interface DuplicatePair {
  a: PersonInfo;
  b: PersonInfo;
  confidence: 'certain' | 'probable' | 'possible';
  reasons: string[];
}

// ─── Normalization ────────────────────────────────────────────────────────────

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Detection ────────────────────────────────────────────────────────────────

async function findDuplicates(): Promise<{ pairs: DuplicatePair[]; ignoredCount: number }> {
  const [persons, overrides] = await Promise.all([getAllPersons(), loadOverrides()]);
  const ignoredSet = new Set(overrides.ignoredDoublons ?? []);
  const pairs: DuplicatePair[] = [];
  const seen = new Set<string>();
  let ignoredCount = 0;

  type Entry = PersonInfo & { keyFull: string };

  const entries: Entry[] = persons.map(p => {
    const firstGiven = p.givenNames.split(/[,\s]+/)[0] || '';
    return {
      id: p.id,
      displayName: p.displayName,
      birthYear: p.birthYear,
      birthPlace: p.birthPlace,
      sex: p.sex,
      keyFull: `${norm(p.surname)}|${norm(firstGiven)}`,
    };
  }).filter(e => {
    const [s, g] = e.keyFull.split('|');
    return s.length > 0 && g.length > 0;
  });

  const groups = new Map<string, Entry[]>();
  for (const e of entries) {
    const g = groups.get(e.keyFull) || [];
    g.push(e);
    groups.set(e.keyFull, g);
  }

  for (const group of groups.values()) {
    if (group.length < 2) continue;

    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];
        const pairKey = [a.id, b.id].sort().join(':');
        if (seen.has(pairKey)) continue;
        seen.add(pairKey);

        if (a.sex !== 'U' && b.sex !== 'U' && a.sex !== b.sex) continue;

        const reasons: string[] = ['Même nom et prénom'];
        let score = 1;

        if (a.birthYear && b.birthYear) {
          const diff = Math.abs(parseInt(a.birthYear) - parseInt(b.birthYear));
          if (diff === 0) { reasons.push(`Même année de naissance (${a.birthYear})`); score += 2; }
          else if (diff <= 1) { reasons.push(`Année de naissance proche (${a.birthYear} vs ${b.birthYear})`); score += 1; }
        } else if (!a.birthYear && !b.birthYear) {
          reasons.push('Aucune date de naissance pour les deux');
        }

        if (a.birthPlace && b.birthPlace && norm(a.birthPlace) === norm(b.birthPlace)) {
          reasons.push(`Même lieu de naissance (${a.birthPlace})`);
          score += 1;
        }

        let confidence: DuplicatePair['confidence'];
        if (score >= 4) confidence = 'certain';
        else if (score >= 3) confidence = 'probable';
        else confidence = 'possible';

        if (ignoredSet.has(pairKey)) {
          ignoredCount++;
          continue;
        }

        pairs.push({
          a: { id: a.id, displayName: a.displayName, birthYear: a.birthYear, birthPlace: a.birthPlace, sex: a.sex },
          b: { id: b.id, displayName: b.displayName, birthYear: b.birthYear, birthPlace: b.birthPlace, sex: b.sex },
          confidence,
          reasons,
        });
      }
    }
  }

  const order = { certain: 0, probable: 1, possible: 2 };
  pairs.sort((a, b) => order[a.confidence] - order[b.confidence]);

  return { pairs, ignoredCount };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DoublonsPage() {
  const { pairs, ignoredCount } = await findDuplicates();

  const certain  = pairs.filter(p => p.confidence === 'certain').length;
  const probable = pairs.filter(p => p.confidence === 'probable').length;
  const possible = pairs.filter(p => p.confidence === 'possible').length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Retour
          </Link>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Détection de doublons</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Certains',  count: certain,  cls: 'text-red-600 dark:text-red-400' },
            { label: 'Probables', count: probable, cls: 'text-amber-600 dark:text-amber-400' },
            { label: 'Possibles', count: possible, cls: 'text-blue-600 dark:text-blue-400' },
            { label: 'Ignorés',   count: ignoredCount, cls: 'text-slate-400' },
          ].map(({ label, count, cls }) => (
            <div key={label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${cls}`}>{count}</p>
              <p className="text-xs text-slate-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {pairs.length === 0 && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-8 text-center">
            <p className="text-green-800 dark:text-green-300 font-medium">
              {ignoredCount > 0
                ? `Aucun doublon actif (${ignoredCount} ignoré${ignoredCount > 1 ? 's' : ''}).`
                : 'Aucun doublon détecté !'}
            </p>
          </div>
        )}

        {/* Legend */}
        {pairs.length > 0 && (
          <p className="text-xs text-slate-400">
            Pour chaque paire, vous pouvez fusionner (les liens familiaux sont automatiquement transférés) ou supprimer l&apos;un des deux.
          </p>
        )}

        {/* Pair cards */}
        {pairs.map((pair, i) => (
          <PairCard
            key={`${pair.a.id}:${pair.b.id}:${i}`}
            a={pair.a}
            b={pair.b}
            confidence={pair.confidence}
            reasons={pair.reasons}
          />
        ))}
      </main>
    </div>
  );
}
