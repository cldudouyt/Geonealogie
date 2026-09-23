import Link from 'next/link';

export default function MigrationHighlight({
  totalCountries,
  crossBorderJourneys,
  minYear,
}: {
  totalCountries: number | null;
  crossBorderJourneys: number;
  minYear: number | null;
}) {
  return (
    <div style={{ background: 'var(--paper-card)', border: '1px solid var(--line)', borderRadius: 16, padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 500, color: 'var(--ink-900)', margin: 0 }}>
          Parcours migratoires
        </h2>
        <Link href="/timeline" style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, color: 'var(--green-600)', textDecoration: 'none' }}>
          Voir la frise →
        </Link>
      </div>

      <p style={{ fontSize: 13.5, color: 'var(--ink-600)', lineHeight: 1.6, margin: '0 0 16px' }}>
        {crossBorderJourneys > 0 ? (
          <>
            <strong style={{ color: 'var(--ink-900)' }}>{crossBorderJourneys} parcours de vie</strong>
            {' '}ont traversé une frontière{totalCountries ? `, à travers ${totalCountries} pays` : ''}
            {minYear ? ` depuis ${minYear}` : ''}.
          </>
        ) : (
          'Explorez la géographie et les migrations de la famille sur la carte des origines.'
        )}
      </p>

      <div style={{ display: 'flex', gap: 10 }}>
        <Link
          href="/map"
          style={{
            flex: 1, textAlign: 'center', padding: '9px 14px', borderRadius: 10,
            fontSize: 13, fontWeight: 600, color: 'var(--ink-900)', textDecoration: 'none',
            border: '1px solid var(--line-strong)', background: 'var(--paper-body)',
          }}
        >
          Carte des origines
        </Link>
        <Link
          href="/timeline"
          style={{
            flex: 1, textAlign: 'center', padding: '9px 14px', borderRadius: 10,
            fontSize: 13, fontWeight: 600, color: 'var(--text-on-dark)', textDecoration: 'none',
            background: 'var(--green-700)',
          }}
        >
          Parcours migratoire
        </Link>
      </div>
    </div>
  );
}
