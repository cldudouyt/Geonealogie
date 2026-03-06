import { Suspense } from 'react';
import FamilyTree from '@/components/tree/FamilyTree';
import Dashboard from '@/components/Dashboard';
import Loading from '@/components/ui/Loading';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const { focus } = await searchParams;

  if (!focus) {
    return <Dashboard />;
  }

  return (
    <Suspense fallback={<Loading message="Chargement..." />}>
      <FamilyTree />
    </Suspense>
  );
}
