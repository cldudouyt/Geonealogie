import Link from 'next/link';
import GlobalMapWrapper from '@/components/map/GlobalMapWrapper';

export default function MapPage() {
  return (
    <div className="flex flex-col h-screen bg-slate-950">
      <header className="shrink-0 bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center gap-4">
        <Link
          href="/"
          className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Accueil
        </Link>
        <h1 className="text-white font-semibold">Carte mondiale des origines</h1>
        <p className="text-slate-400 text-sm ml-auto hidden sm:block">
          Naissances et décès géolocalisés de toute la famille
        </p>
      </header>
      <div className="flex-1 min-h-0">
        <GlobalMapWrapper />
      </div>
    </div>
  );
}
