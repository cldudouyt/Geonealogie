'use client';

import dynamic from 'next/dynamic';

const GlobalMap = dynamic(() => import('./GlobalMap'), { ssr: false });

export default function GlobalMapWrapper({ className }: { className?: string }) {
  return <div className={className} style={{ height: '100%', width: '100%' }}><GlobalMap /></div>;
}
