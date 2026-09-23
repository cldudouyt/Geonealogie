import { Suspense } from 'react';
import { getDefaultPersonId } from '@/lib/gedcom-store';
import { getSession } from '@/lib/session';
import { listDbUsers, hasDb } from '@/lib/db';
import TreePage from './TreePage';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Arbre généalogique — Géonéalogie',
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string; view?: string }>;
}) {
  await searchParams; // consume to avoid warning
  const defaultFocusId = await getDefaultPersonId();

  // Personne liée au compte connecté (pour centrage multi-appareils)
  let userPersonId: string | null = null;
  try {
    const session = await getSession();
    if (session?.id && hasDb()) {
      const users = await listDbUsers();
      userPersonId = users.find(u => u.id === session.id)?.personId ?? null;
    }
  } catch { /* non-bloquant */ }

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
      <TreePage defaultFocusId={defaultFocusId} userPersonId={userPersonId} />
    </Suspense>
  );
}
