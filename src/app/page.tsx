import { Suspense } from 'react';
import FamilyTree from '@/components/tree/FamilyTree';
import Loading from '@/components/ui/Loading';

export default function Home() {
  return (
    <Suspense fallback={<Loading message="Chargement..." />}>
      <FamilyTree />
    </Suspense>
  );
}
