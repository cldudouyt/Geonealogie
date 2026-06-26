import { getAllPersons } from '@/lib/gedcom-store';
import { loadOverrides } from '@/lib/overrides-store';
import PairCard from './PairCard';

export const metadata = { title: 'Détection de doublons — Géonéalogie' };

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
    <div className="h-screen overflow-y-auto" style={{ background: '#f4f1ea' }}>
      <main className="mx-auto px-6 py-8 space-y-6" style={{ maxWidth: 880 }}>

        {/* En-tête */}
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: 30, fontWeight: 500, color: '#1c1f1c', letterSpacing: '-.02em', marginBottom: 6 }}>
            Détection de doublons
          </h1>
          <p style={{ fontSize: 13.5, color: '#8a8474' }}>
            Fusionnez ou écartez les paires de personnes potentiellement identiques.
          </p>
        </div>

        {/* Grille stats 4 colonnes */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Certains',  count: certain,      color: '#c0392b' },
            { label: 'Probables', count: probable,     color: '#b8860b' },
            { label: 'Possibles', count: possible,     color: '#5b7da3' },
            { label: 'Ignorés',   count: ignoredCount, color: '#9a9080' },
          ].map(({ label, count, color }) => (
            <div
              key={label}
              style={{
                background: '#fffdf9',
                border: '1px solid #e7e0d0',
                borderRadius: 16,
                padding: '16px 12px',
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>{count}</p>
              <p style={{ fontSize: 12, color: '#8a8474', marginTop: 6 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Aucun doublon */}
        {pairs.length === 0 && (
          <div style={{ background: '#fffdf9', border: '1px solid #e7e0d0', borderRadius: 16, padding: 32, textAlign: 'center' }}>
            <p style={{ color: '#2f5142', fontWeight: 500 }}>
              {ignoredCount > 0
                ? `Aucun doublon actif (${ignoredCount} ignoré${ignoredCount > 1 ? 's' : ''}).`
                : 'Aucun doublon détecté !'}
            </p>
          </div>
        )}

        {/* Cards de paires */}
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
