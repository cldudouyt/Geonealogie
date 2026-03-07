'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { mergePersonsAction, deletePersonAction, ignoreDoublonAction } from './actions';

interface Person {
  id: string;
  displayName: string;
  birthYear?: string;
  birthPlace?: string;
}

interface PairCardProps {
  a: Person;
  b: Person;
  confidence: 'certain' | 'probable' | 'possible';
  reasons: string[];
}

const BADGE: Record<PairCardProps['confidence'], { label: string; cls: string }> = {
  certain:  { label: 'Certain',  cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  probable: { label: 'Probable', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  possible: { label: 'Possible', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
};

export default function PairCard({ a, b, confidence, reasons }: PairCardProps) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null); // id awaiting confirm
  const [confirmMerge, setConfirmMerge] = useState<{ keepId: string; deleteId: string } | null>(null);

  const badge = BADGE[confidence];

  if (done) return null;

  const handleMerge = (keepId: string, deleteId: string) => {
    startTransition(async () => {
      await mergePersonsAction(keepId, deleteId);
      setDone(true);
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deletePersonAction(id);
      setDone(true);
    });
  };

  const handleIgnore = () => {
    startTransition(async () => {
      await ignoreDoublonAction(a.id, b.id);
      setDone(true);
    });
  };

  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden transition-opacity ${isPending ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${badge.cls}`}>
            {badge.label}
          </span>
          <p className="text-xs text-slate-400 truncate">{reasons.join(' · ')}</p>
        </div>
        <button
          onClick={handleIgnore}
          className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 shrink-0 transition-colors"
          title="Ignorer ce doublon"
        >
          Ignorer
        </button>
      </div>

      {/* Persons side by side */}
      <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-800">
        {([a, b] as Person[]).map((person, idx) => {
          const other = idx === 0 ? b : a;
          return (
            <div key={person.id} className="px-5 py-4 space-y-3">
              <div>
                <Link
                  href={`/person/${person.id}`}
                  className="text-sm font-semibold text-slate-800 dark:text-slate-200 hover:text-primary transition-colors"
                >
                  {person.displayName}
                </Link>
                <p className="text-xs text-slate-400 mt-0.5">
                  {[
                    person.birthYear ? `né(e) ${person.birthYear}` : null,
                    person.birthPlace ?? null,
                  ].filter(Boolean).join(' · ') || 'Aucune info'}
                </p>
                <div className="mt-1.5 flex gap-2">
                  <Link
                    href={`/person/${person.id}`}
                    className="text-xs px-2 py-0.5 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Fiche
                  </Link>
                  <Link
                    href={`/?focus=${person.id}`}
                    className="text-xs px-2 py-0.5 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Arbre
                  </Link>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                {/* Merge keeping this person */}
                {confirmMerge?.keepId === person.id ? (
                  <div className="flex gap-1.5 items-center">
                    <span className="text-xs text-slate-500">Confirmer la fusion ?</span>
                    <button
                      onClick={() => { handleMerge(confirmMerge.keepId, confirmMerge.deleteId); setConfirmMerge(null); }}
                      className="text-xs px-2 py-0.5 bg-primary text-white rounded font-medium hover:opacity-90"
                    >Oui</button>
                    <button onClick={() => setConfirmMerge(null)} className="text-xs px-2 py-0.5 border border-slate-200 dark:border-slate-700 rounded text-slate-500">Non</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmMerge({ keepId: person.id, deleteId: other.id })}
                    className="w-full text-left text-xs px-2.5 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors font-medium"
                  >
                    Fusionner → garder celui-ci
                  </button>
                )}

                {/* Delete this person */}
                {confirmDelete === person.id ? (
                  <div className="flex gap-1.5 items-center">
                    <span className="text-xs text-slate-500">Supprimer définitivement ?</span>
                    <button
                      onClick={() => { handleDelete(person.id); setConfirmDelete(null); }}
                      className="text-xs px-2 py-0.5 bg-red-500 text-white rounded font-medium hover:opacity-90"
                    >Oui</button>
                    <button onClick={() => setConfirmDelete(null)} className="text-xs px-2 py-0.5 border border-slate-200 dark:border-slate-700 rounded text-slate-500">Non</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(person.id)}
                    className="w-full text-left text-xs px-2.5 py-1.5 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Supprimer celui-ci
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
