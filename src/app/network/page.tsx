import Link from 'next/link';
import NetworkWrapper from './NetworkWrapper';

export default function NetworkPage() {
  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-3 shrink-0">
        <div className="max-w-full flex items-center gap-4">
          <Link href="/" className="text-sm text-primary hover:underline flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Arbre
          </Link>
          <h1 className="text-lg font-bold text-slate-800 dark:text-slate-200">Graphe de réseau familial</h1>
          <span className="text-xs text-slate-400">Glissez les nœuds · Molette pour zoomer · Clic pour ouvrir la fiche</span>
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        <NetworkWrapper />
      </div>
    </div>
  );
}
