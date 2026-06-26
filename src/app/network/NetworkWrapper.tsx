'use client';

import dynamic from 'next/dynamic';

const NetworkGraph = dynamic(() => import('@/components/network/NetworkGraph'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '540px',
        backgroundImage: 'radial-gradient(#e4dcc8 1px, transparent 1px)',
        backgroundSize: '22px 22px',
        backgroundColor: '#fbf9f3',
        borderRadius: '20px',
        border: '1px solid #e9e2d2',
        color: '#8a8474',
        fontFamily: 'Hanken Grotesk, sans-serif',
        fontSize: '14px',
      }}
    >
      Chargement du graphe…
    </div>
  ),
});

export default function NetworkWrapper({ defaultFocusId }: { defaultFocusId: string }) {
  return <NetworkGraph defaultFocusId={defaultFocusId} />;
}
