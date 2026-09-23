'use client';
import { useEffect, useRef, useState, Suspense } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import NavRail from './NavRail';
import GlobalHeader from './GlobalHeader';
import { ExplorationTracker } from './PersonalJourney';
import { useSession } from './SessionContext';
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const session = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const moreButton = useRef<HTMLButtonElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollerRef.current?.scrollTo(0, 0); dialog.current?.close(); }, [pathname]);
  if (pathname === '/login') return <>{children}</>;
  const close = () => { dialog.current?.close(); setMenuOpen(false); moreButton.current?.focus(); };
  return <div className="app-shell">
    <a href="#main-content" className="skip-link">Aller au contenu</a>
    <Suspense fallback={null}><ExplorationTracker /></Suspense>
    <aside className="desktop-navigation"><NavRail /></aside>
    <div className="app-main">{pathname !== '/' && <GlobalHeader />}<div id="main-content" tabIndex={-1} ref={scrollerRef} className="app-scroller">{children}</div></div>
    <nav aria-label="Navigation principale mobile" className="mobile-navigation">
      {[['/', 'Accueil'], ['/tree', 'Arbre'], ['/search', 'Recherche']].map(([href, label]) => <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined}>{label}</Link>)}
      {session.canEdit && <Link href="/person/new" aria-current={pathname === '/person/new' ? 'page' : undefined}>Ajouter</Link>}
      <button ref={moreButton} aria-expanded={menuOpen} aria-controls="mobile-menu" onClick={() => { dialog.current?.showModal(); setMenuOpen(true); }}>Plus</button>
    </nav>
    <dialog id="mobile-menu" ref={dialog} className="mobile-menu" aria-label="Toutes les rubriques" onClose={() => setMenuOpen(false)} onClick={e => { if (e.target === dialog.current) close(); }}>
      <button className="menu-close" onClick={close}>Fermer ×</button><NavRail />
    </dialog>
  </div>;
}
