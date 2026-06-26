import OriginsMapSection from '@/components/map/OriginsMapSection';

export const metadata = { title: 'Carte des origines — Géonéalogie' };

export default function MapPage() {
  return (
    <div style={{
      padding: '30px 40px 60px',
      minHeight: '100vh',
      background: 'var(--paper-body)',
    }}>
      <h1 style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 30,
        fontWeight: 600,
        margin: '0 0 6px',
        color: 'var(--ink-900)',
        letterSpacing: 'var(--track-tight)',
      }}>
        Carte des origines
      </h1>
      <p style={{
        fontSize: 13.5,
        color: 'var(--ink-600)',
        margin: '0 0 22px',
      }}>
        Berceaux familiaux, de la Manche à Santiago de Cuba.
      </p>
      <OriginsMapSection />
    </div>
  );
}
