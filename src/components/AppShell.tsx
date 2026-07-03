'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import NavRail from './NavRail';
import GlobalHeader from './GlobalHeader';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === '/login';
  const scrollerRef = useRef<HTMLDivElement>(null);

  // The shell scroller persists across client navigations; Next.js only resets
  // window scroll, so reset it manually on route change.
  useEffect(() => {
    scrollerRef.current?.scrollTo(0, 0);
  }, [pathname]);

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <NavRail />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <GlobalHeader />
        <div ref={scrollerRef} style={{ flex: 1, overflowY: 'auto', background: '#f4f1ea' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
