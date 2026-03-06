'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

export type ViewMode = 'tree' | 'horizontal' | 'fan' | 'wheel' | 'ahnentafel';

const VIEWS: { id: ViewMode; label: string; title: string; icon: string }[] = [
  { id: 'tree',        label: 'Arbre',       title: 'Arbre vertical',      icon: 'M12 3v18M12 3c-3 0-6 3-6 6s3 3 6 3M12 3c3 0 6 3 6 6s-3 3-6 3M12 12c-3 0-6 3-6 6M12 12c3 0 6 3 6 6' },
  { id: 'horizontal',  label: 'Horizontal',  title: 'Arbre horizontal',    icon: 'M3 12h18M3 12l4-4m-4 4l4 4M21 6H9m12 0l-4-4m4 4l-4 4M21 18H9m12 0l-4-4m4 4l-4 4' },
  { id: 'fan',         label: 'Éventail',    title: 'Éventail (demi-cercle)', icon: 'M12 19V5M5.5 12a6.5 6.5 0 0113 0' },
  { id: 'wheel',       label: 'Roue',        title: 'Roue généalogique',   icon: 'M12 12m-9 0a9 9 0 1018 0 9 9 0 00-18 0M12 3v18M3 12h18' },
  { id: 'ahnentafel',  label: 'Liste',       title: 'Liste numérotée',     icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
];

interface ViewSelectorProps {
  current: ViewMode;
}

export default function ViewSelector({ current }: ViewSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const switchView = useCallback((view: ViewMode) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', view);
    router.push(`/?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-md">
      {VIEWS.map(v => (
        <button
          key={v.id}
          onClick={() => switchView(v.id)}
          title={v.title}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            current === v.id
              ? 'bg-primary text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={v.icon} />
          </svg>
          <span className="hidden sm:inline">{v.label}</span>
        </button>
      ))}
    </div>
  );
}
