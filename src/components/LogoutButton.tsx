'use client';

import { usePathname } from 'next/navigation';
import { logout } from '@/app/login/actions';

export default function LogoutButton() {
  const pathname = usePathname();
  if (pathname === '/login' || pathname === '/feedback') return null;

  return (
    <form action={logout} style={{ position: 'fixed', bottom: '1rem', right: '1rem', zIndex: 100 }}>
      <button
        type="submit"
        className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 shadow-sm transition-colors"
        title="Se déconnecter"
      >
        Déconnexion
      </button>
    </form>
  );
}
