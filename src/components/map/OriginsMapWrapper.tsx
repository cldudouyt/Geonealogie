'use client';

import dynamic from 'next/dynamic';
import type { BirthplaceEntry, FocusedPerson } from './OriginsMap';

const OriginsMap = dynamic(() => import('./OriginsMap'), { ssr: false });

interface Props {
  places: BirthplaceEntry[];
  flyToRef: React.MutableRefObject<((lat: number, lng: number) => void) | null>;
  focusedPerson?: FocusedPerson | null;
}

export default function OriginsMapWrapper({ places, flyToRef, focusedPerson }: Props) {
  return (
    <div style={{ height: '100%', width: '100%' }}>
      <OriginsMap places={places} flyToRef={flyToRef} focusedPerson={focusedPerson} />
    </div>
  );
}
