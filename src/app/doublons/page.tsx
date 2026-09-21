import { analyzeDuplicatesAction } from './actions';
import BatchMerge from './BatchMerge';
import Link from 'next/link';
import PairCard from './PairCard';

export const metadata = { title: 'Détection de doublons — Géonéalogie' };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DoublonsPage({ searchParams }: { searchParams: Promise<{ merged?: string }> }) {
  const { merged } = await searchParams;
  const { pairs, ignoredCount } = await analyzeDuplicatesAction();

  const certain  = pairs.filter(p => p.confidence === 'certain').length;
  const probable = pairs.filter(p => p.confidence === 'probable').length;
  const possible = pairs.filter(p => p.confidence === 'possible').length;

  return (
    <div className="min-h-full" style={{ background: '#f4f1ea' }}>
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

        {merged === '1' && <p role="status" className="empty-state">Fusion enregistrée. <Link href="/history">Consulter l’historique ou annuler</Link></p>}
        <BatchMerge />
        {/* Grille stats 4 colonnes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Forte concordance',  count: certain,      color: '#c0392b' },
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
            blockers={pair.blockers}
          />
        ))}
      </main>
    </div>
  );
}
