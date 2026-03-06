'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { PersonSummary } from '@/lib/types';

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [surname, setSurname] = useState('');
  const [place, setPlace] = useState('');
  const [occupation, setOccupation] = useState('');
  const [results, setResults] = useState<PersonSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const limit = 20;

  const search = useCallback(async (pageNum: number = 1) => {
    setLoading(true);
    setSearched(true);

    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (surname) params.set('surname', surname);
    if (place) params.set('place', place);
    if (occupation) params.set('occupation', occupation);
    params.set('page', String(pageNum));
    params.set('limit', String(limit));

    try {
      const res = await fetch(`/api/persons?${params}`);
      const data = await res.json();
      setResults(data.persons || []);
      setTotal(data.total || 0);
      setPage(pageNum);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, surname, place, occupation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    search(1);
  };

  return (
    <div className="h-screen overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link href="/" className="text-sm text-primary hover:underline flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Arbre
          </Link>
          <h1 className="text-lg font-bold text-slate-800 dark:text-slate-200">Recherche</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {/* Search form */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Recherche libre
              </label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nom, prenom, lieu..."
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nom de famille
              </label>
              <input
                type="text"
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                placeholder="DUDOUYT"
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Lieu
              </label>
              <input
                type="text"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="Paris, Bretagne..."
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Profession
              </label>
              <input
                type="text"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder="Cultivateur, notaire..."
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-light transition-colors disabled:opacity-50"
              >
                {loading ? 'Recherche...' : 'Rechercher'}
              </button>
            </div>
          </div>
        </form>

        {/* Results */}
        {searched && (
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800">
              <p className="text-sm text-slate-500">{total} resultat{total !== 1 ? 's' : ''}</p>
            </div>

            {results.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                Aucun resultat
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {results.map((person) => {
                  const dot = person.sex === 'M' ? 'bg-blue-500' : person.sex === 'F' ? 'bg-pink-500' : 'bg-gray-400';
                  return (
                    <div
                      key={person.id}
                      className="flex items-center px-6 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${dot} shrink-0 mr-3`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{person.displayName}</p>
                        <p className="text-xs text-slate-400">
                          {person.birthDate && person.birthDate.substring(0, 4)}
                          {person.deathDate && ` - ${person.deathDate.substring(0, 4)}`}
                          {person.birthPlace && ` | ${person.birthPlace}`}
                          {person.occupation && ` | ${person.occupation}`}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Link
                          href={`/person/${person.id}`}
                          className="px-3 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                          Fiche
                        </Link>
                        <button
                          onClick={() => router.push(`/?focus=${person.id}`)}
                          className="px-3 py-1 text-xs bg-primary text-white rounded hover:bg-primary-light transition-colors"
                        >
                          Arbre
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {total > limit && (
              <div className="flex items-center justify-center gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => search(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Precedent
                </button>
                <span className="text-sm text-slate-500">
                  Page {page} / {Math.ceil(total / limit)}
                </span>
                <button
                  onClick={() => search(page + 1)}
                  disabled={page * limit >= total}
                  className="px-3 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Suivant
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
