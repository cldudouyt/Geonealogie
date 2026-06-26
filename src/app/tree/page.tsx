import { Suspense } from 'react';
import { getDefaultPersonId } from '@/lib/gedcom-store';
import TreePage from './TreePage';

export const metadata = {
  title: 'Arbre généalogique — Géonéalogie',
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string; view?: string }>;
}) {
  await searchParams; // consume to avoid warning
  const defaultFocusId = await getDefaultPersonId(); // always the genealogical root (Léa)

  return (
    <Suspense fallback={
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 300,
        color: '#8a8474',
        fontSize: 14,
      }}>
        Chargement…
      </div>
    }>
      <TreePage defaultFocusId={defaultFocusId} />
    </Suspense>
  );
}
