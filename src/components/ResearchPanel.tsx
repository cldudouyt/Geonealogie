'use client';

import { useState } from 'react';

interface WikiResult {
  title: string;
  extract: string;
  thumbnail?: { source: string };
  content_urls?: { desktop: { page: string } };
}

interface Props {
  givenNames: string;
  surname: string;
  birthYear?: string;
  deathYear?: string;
  birthPlace?: string;
}

const EXTERNAL_SOURCES = [
  {
    label: 'Maitron',
    description: 'Dictionnaire biographique mouvement ouvrier/social',
    color: '#b91c1c',
    url: (q: string) => `https://maitron.fr/?terme=${encodeURIComponent(q)}`,
  },
  {
    label: 'Geneanet',
    description: 'Base de données généalogiques',
    color: '#15803d',
    url: (q: string, surname: string, given: string) =>
      `https://www.geneanet.org/recherche/?action=recherche&lang=fr&nom=${encodeURIComponent(surname)}&prenom=${encodeURIComponent(given)}`,
  },
  {
    label: 'BnF / Gallica',
    description: 'Bibliothèque nationale de France',
    color: '#1e40af',
    url: (q: string) => `https://gallica.bnf.fr/recherche/first?q=${encodeURIComponent(q)}`,
  },
  {
    label: 'Archives nationales',
    description: 'Archives en ligne',
    color: '#6b21a8',
    url: (q: string) => `https://www.siv.archives-nationales.culture.gouv.fr/siv/rechercheSimple?searchString=${encodeURIComponent(q)}`,
  },
  {
    label: 'Google Scholar',
    description: 'Publications académiques',
    color: '#0369a1',
    url: (q: string) => `https://scholar.google.fr/scholar?q=${encodeURIComponent(q)}`,
  },
  {
    label: 'LinkedIn',
    description: 'Profil professionnel',
    color: '#0a66c2',
    url: (q: string) => `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(q)}`,
  },
  {
    label: 'Geni',
    description: 'Arbre généalogique mondial',
    color: '#c2410c',
    url: (q: string) => `https://www.geni.com/search?search_type=people&names=${encodeURIComponent(q)}`,
  },
  {
    label: 'FamilySearch',
    description: 'Registres généalogiques mondiaux',
    color: '#1d4ed8',
    url: (q: string) => `https://www.familysearch.org/fr/search/record/results?q.givenName=${encodeURIComponent(q)}`,
  },
];

async function searchWikipedia(lang: 'fr' | 'en', name: string): Promise<WikiResult[]> {
  // Step 1: search for matching titles
  const searchRes = await fetch(
    `https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(name)}&limit=3&format=json&origin=*`
  );
  const [, titles] = await searchRes.json() as [string, string[], string[], string[]];
  if (!titles?.length) return [];

  // Step 2: get summaries for each title
  const results = await Promise.all(
    titles.slice(0, 2).map(async (title) => {
      try {
        const res = await fetch(
          `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
          { headers: { 'Api-User-Agent': 'Geonealogie/1.0' } }
        );
        if (!res.ok) return null;
        return await res.json() as WikiResult;
      } catch { return null; }
    })
  );
  return results.filter(Boolean) as WikiResult[];
}

export default function ResearchPanel({ givenNames, surname, birthYear, deathYear, birthPlace }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [wikiResults, setWikiResults] = useState<{ lang: string; result: WikiResult }[]>([]);
  const [searched, setSearched] = useState(false);

  const fullName = `${givenNames.split(',')[0].trim()} ${surname}`.trim();
  const nameWithDates = `${fullName}${birthYear ? ` ${birthYear}` : ''}${deathYear ? `-${deathYear}` : ''}`;

  const runSearch = async () => {
    setLoading(true);
    const [frResults, enResults] = await Promise.all([
      searchWikipedia('fr', fullName),
      searchWikipedia('en', fullName),
    ]);
    const combined: { lang: string; result: WikiResult }[] = [
      ...frResults.map(r => ({ lang: 'fr', result: r })),
      ...enResults.map(r => ({ lang: 'en', result: r })),
    ];
    // Deduplicate by title
    const seen = new Set<string>();
    const unique = combined.filter(({ result }) => {
      if (seen.has(result.title)) return false;
      seen.add(result.title);
      return true;
    });
    setWikiResults(unique);
    setSearched(true);
    setLoading(false);
  };

  const toggle = () => {
    setOpen(v => !v);
    if (!searched && !open) runSearch();
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm overflow-hidden mt-6">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h2 className="text-base font-semibold text-slate-700 dark:text-slate-300">Recherche en ligne</h2>
          <span className="text-xs text-slate-400 font-normal">Wikipedia, Maitron, Geneanet…</span>
        </div>
        <svg className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-slate-100 dark:border-slate-800 px-6 py-5 space-y-6">

          {/* Wikipedia results */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 inline-flex items-center justify-center text-xs font-bold">W</span>
                Wikipedia
              </h3>
              <a
                href={`https://fr.wikipedia.org/w/index.php?search=${encodeURIComponent(fullName)}`}
                target="_blank" rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                Rechercher sur Wikipedia →
              </a>
            </div>

            {loading && (
              <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Recherche Wikipedia en cours…
              </div>
            )}

            {!loading && searched && wikiResults.length === 0 && (
              <p className="text-sm text-slate-400 py-2">Aucun résultat Wikipedia pour &laquo;{fullName}&raquo;.</p>
            )}

            {!loading && wikiResults.length > 0 && (
              <div className="space-y-3">
                {wikiResults.map(({ lang, result }) => (
                  <a
                    key={result.title}
                    href={result.content_urls?.desktop.page ?? `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(result.title)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-primary/30 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                  >
                    {result.thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={result.thumbnail.source}
                        alt={result.title}
                        className="w-14 h-14 object-cover rounded shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium group-hover:text-primary transition-colors">{result.title}</p>
                        <span className="text-xs text-slate-400 uppercase">{lang}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-3 leading-relaxed">
                        {result.extract}
                      </p>
                    </div>
                    <svg className="w-4 h-4 text-slate-300 group-hover:text-primary shrink-0 mt-0.5 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* External source links */}
          <div>
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3">Autres sources</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {EXTERNAL_SOURCES.map((source) => {
                const href = source.url(nameWithDates, surname, givenNames.split(',')[0].trim());
                return (
                  <a
                    key={source.label}
                    href={href}
                    target="_blank" rel="noopener noreferrer"
                    className="flex flex-col gap-0.5 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                  >
                    <span className="text-sm font-semibold group-hover:text-primary transition-colors" style={{ color: source.color }}>
                      {source.label}
                    </span>
                    <span className="text-xs text-slate-400 leading-tight">{source.description}</span>
                  </a>
                );
              })}
            </div>
          </div>

          {/* Search term info */}
          <p className="text-xs text-slate-400">
            Terme de recherche utilisé : <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{nameWithDates}</span>
            {birthPlace && <> · Lieu : <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{birthPlace}</span></>}
          </p>
        </div>
      )}
    </div>
  );
}
