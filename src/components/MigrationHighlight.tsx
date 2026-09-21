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
    <div style={{ background: '#fffdf9', border: '1px solid #e7e0d0', borderRadius: 16, padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 500, color: '#1c1f1c', margin: 0 }}>
          Parcours migratoires
        </h2>
        <Link href="/timeline" style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, color: '#2f5142', textDecoration: 'none' }}>
          Voir la frise →
        </Link>
      </div>

      <p style={{ fontSize: 13.5, color: '#3f4a41', lineHeight: 1.6, margin: '0 0 16px' }}>
        {crossBorderJourneys > 0 ? (
          <>
            <strong style={{ color: '#1c1f1c' }}>{crossBorderJourneys} parcours de vie</strong>
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
            fontSize: 13, fontWeight: 600, color: '#1c1f1c', textDecoration: 'none',
            border: '1px solid #e0d8c6', background: '#fffdf9',
          }}
        >
          Carte des origines
        </Link>
        <Link
          href="/timeline"
          style={{
            flex: 1, textAlign: 'center', padding: '9px 14px', borderRadius: 10,
            fontSize: 13, fontWeight: 600, color: '#f1ede2', textDecoration: 'none',
            background: '#1e3a2f',
          }}
        >
          Parcours migratoire
        </Link>
      </div>
    </div>
  );
}
