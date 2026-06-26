'use client';
import { usePathname } from 'next/navigation';
import NavRail from './NavRail';
import GlobalHeader from './GlobalHeader';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === '/login';

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <NavRail />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <GlobalHeader />
        <div style={{ flex: 1, overflowY: 'auto', background: '#f4f1ea' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
