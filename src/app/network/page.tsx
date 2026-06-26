import { searchPersons } from '@/lib/gedcom-store';
import NetworkWrapper from './NetworkWrapper';

export const metadata = { title: 'Réseau de relations — Géonéalogie' };

export default async function NetworkPage() {
  const results = await searchPersons('Jean Dudouyt', 1);
  const defaultFocusId = results[0]?.id ?? '';
  const defaultName = results[0]?.displayName ?? 'Jean Dudouyt';

  return (
    <main
      style={{
        padding: '30px 40px 60px',
        backgroundColor: '#f4f1ea',
        minHeight: '100vh',
      }}
    >
      <div style={{ marginBottom: '24px' }}>
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '30px',
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: '#1c1f1c',
            margin: 0,
          }}
        >
          Réseau de relations
        </h1>
        <p
          style={{
            fontSize: '13.5px',
            color: '#8a8474',
            marginTop: '6px',
            marginBottom: 0,
          }}
        >
          Les liens directs autour de{' '}
          <strong style={{ fontWeight: 600, color: '#1c1f1c' }}>{defaultName}</strong>
          {' '}— cliquez un proche pour explorer son réseau.
        </p>
      </div>
      <NetworkWrapper defaultFocusId={defaultFocusId} />
    </main>
  );
}
