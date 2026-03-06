'use client';

import dynamic from 'next/dynamic';
import type { MapMarker } from './PersonMap';

const PersonMap = dynamic(() => import('./PersonMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[380px] bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
  ),
});

export default function PersonMapWrapper({ markers, centerId }: { markers: MapMarker[]; centerId?: string }) {
  return <PersonMap markers={markers} centerId={centerId} />;
}
