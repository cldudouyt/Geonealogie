'use client';

import { useState } from 'react';
import type { TreeData } from '@/lib/types';
import { useAncestorLayout } from './useAncestorLayout';

interface AhnentafelViewProps {
  treeData: TreeData;
  selectedId: string | null;
  onNodeClick: (id: string) => void;
  onNodeDoubleClick: (id: string) => void;
}

const GEN_LABELS: Record<number, string> = {
  0: 'Personne de référence',
  1: 'Parents',
  2: 'Grands-parents',
  3: 'Arrière-grands-parents',
  4: 'Arrière-arrière-grands-parents',
  5: 'G4 arrière-grands-parents',
  6: 'G5 arrière-grands-parents',
  7: 'G6 arrière-grands-parents',
};

export default function AhnentafelView({
  treeData,
  selectedId,
  onNodeClick,
  onNodeDoubleClick,
}: AhnentafelViewProps) {
  const ancestors = useAncestorLayout(treeData);
  const maxGen = Math.max(...ancestors.map(a => a.gen), 0);

  // All generations open by default; user can collapse
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  const byGen = new Map<number, typeof ancestors>();
  for (const a of ancestors) {
    const g = byGen.get(a.gen) || [];
    g.push(a);
    byGen.set(a.gen, g);
  }

  const toggleGen = (gen: number) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(gen) ? next.delete(gen) : next.add(gen);
      return next;
    });
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Tableau Ahnentafel</h2>
          <p className="text-sm text-slate-500 mt-1">
            Numérotation systématique : n° 1 = personne de référence, père = 2n, mère = 2n+1
          </p>
        </div>

        <div className="space-y-3">
          {Array.from({ length: maxGen + 1 }, (_, gen) => {
            const people = byGen.get(gen) || [];
            if (people.length === 0) return null;
            const isCollapsed = collapsed.has(gen);
            const total = Math.pow(2, gen);
            const known = people.length;

            return (
              <div key={gen} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                {/* Generation header */}
                <button
                  onClick={() => toggleGen(gen)}
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-400 w-10 text-right">{gen === 0 ? '#1' : `${Math.pow(2, gen)}–${Math.pow(2, gen + 1) - 1}`}</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{GEN_LABELS[gen] || `Génération ${gen}`}</span>
                    <span className="text-xs text-slate-400">
                      {known}/{total} {known < total && <span className="text-amber-500">({total - known} inconnu{total - known > 1 ? 's' : ''})</span>}
                    </span>
                  </div>
                  <svg
                    className={`w-4 h-4 text-slate-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Person rows */}
                {!isCollapsed && (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {Array.from({ length: total }, (_, pos) => {
                      const ahnen = Math.pow(2, gen) + pos;
                      const person = people.find(p => p.posInGen === pos);
                      const isSelected = person?.id === selectedId;

                      if (!person) {
                        return (
                          <div key={ahnen} className="flex items-center gap-4 px-5 py-2.5 opacity-40">
                            <span className="text-xs font-mono text-slate-400 w-6 text-right shrink-0">{ahnen}</span>
                            <span className="text-sm text-slate-400 italic">Inconnu(e)</span>
                          </div>
                        );
                      }

                      const sexDot = person.sex === 'M' ? 'bg-blue-400' : person.sex === 'F' ? 'bg-pink-400' : 'bg-slate-400';

                      return (
                        <button
                          key={ahnen}
                          onClick={() => onNodeClick(person.id)}
                          onDoubleClick={() => onNodeDoubleClick(person.id)}
                          className={`w-full flex items-center gap-4 px-5 py-2.5 text-left transition-colors ${
                            isSelected
                              ? 'bg-amber-50 dark:bg-amber-900/20'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span className="text-xs font-mono text-slate-400 w-6 text-right shrink-0">{ahnen}</span>
                          <span className={`w-2 h-2 rounded-full ${sexDot} shrink-0`} />
                          <span className="font-medium text-slate-800 dark:text-slate-100 flex-1 truncate">
                            {person.displayName}
                          </span>
                          <span className="text-xs text-slate-400 shrink-0">
                            {person.birthYear || '?'}
                            {person.deathYear ? ` – ${person.deathYear}` : ''}
                          </span>
                          {person.occupation && (
                            <span className="text-xs text-slate-400 truncate max-w-[150px] hidden sm:block">
                              {person.occupation}
                            </span>
                          )}
                          <svg className="w-3.5 h-3.5 text-slate-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-xs text-slate-400 text-center mt-6">
          Double-clic sur une personne pour recentrer l'arbre sur elle
        </p>
      </div>
    </div>
  );
}
