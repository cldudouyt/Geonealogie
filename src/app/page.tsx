import { Suspense } from 'react';
import FamilyTree from '@/components/tree/FamilyTree';
import Dashboard from '@/components/Dashboard';
import Loading from '@/components/ui/Loading';
import { getDefaultPersonId } from '@/lib/gedcom-store';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const { focus } = await searchParams;

  if (!focus) {
    return <Dashboard />;
  }

  const defaultRootId = getDefaultPersonId();

  return (
    <Suspense fallback={<Loading message="Chargement..." />}>
      <FamilyTree defaultRootId={defaultRootId} />
    </Suspense>
  );
}
