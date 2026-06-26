import { Suspense } from 'react';

export const metadata = { title: 'Chemin de parenté — Géonéalogie' };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
