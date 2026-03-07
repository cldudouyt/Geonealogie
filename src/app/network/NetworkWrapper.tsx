'use client';

import dynamic from 'next/dynamic';

const NetworkGraph = dynamic(() => import('@/components/network/NetworkGraph'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: 14 }}>
      Chargement du graphe…
    </div>
  ),
});

export default function NetworkWrapper() {
  return <NetworkGraph />;
}
