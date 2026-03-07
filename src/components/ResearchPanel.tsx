'use client';

import { useState } from 'react';
import type { MaitronResult } from '@/app/api/research/maitron/route';
import type { WikidataResult } from '@/app/api/research/wikidata/route';
import type { ViafResult } from '@/app/api/research/viaf/route';
import type { BnfResult } from '@/app/api/research/bnf/route';

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
    label: 'Geneanet',
    description: 'Fonds d\'archives généalogiques',
    color: '#15803d',
    url: (_q: string, surname: string, given: string) =>
      `https://www.geneanet.org/fonds/individus/?size=10&nom=${encodeURIComponent(surname)}&prenom=${encodeURIComponent(given)}&go=1`,
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
    url: (q: string) => `https://www.geni.com/search?names=${encodeURIComponent(q)}`,
  },
  {
    label: 'FamilySearch',
    description: 'Registres généalogiques mondiaux',
    color: '#1d4ed8',
    url: (q: string) => `https://www.familysearch.org/fr/search/record/results?q.givenName=${encodeURIComponent(q)}`,
  },
  {
    label: 'Archives nationales',
    description: 'Archives en ligne',
    color: '#6b21a8',
    url: (q: string) => `https://www.siv.archives-nationales.culture.gouv.fr/siv/rechercheSimple?searchString=${encodeURIComponent(q)}`,
  },
];

async function searchWikipedia(lang: 'fr' | 'en', name: string): Promise<WikiResult[]> {
  const searchRes = await fetch(
    `https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(name)}&limit=3&format=json&origin=*`
  );
  const [, titles] = await searchRes.json() as [string, string[], string[], string[]];
  if (!titles?.length) return [];

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

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin inline-block" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

function ExtIcon({ className }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 shrink-0 mt-0.5 transition-colors ${className ?? ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

interface SectionHeaderProps {
  icon: React.ReactNode;
  label: string;
  loading: boolean;
  searched: boolean;
  count: number;
  badgeCls: string;
  externalHref: string;
  externalLabel: string;
  externalCls: string;
}

function SectionHeader({ icon, label, loading, searched, count, badgeCls, externalHref, externalLabel, externalCls }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
        {icon}
        {label}
        {loading && <Spinner />}
        {!loading && searched && count > 0 && (
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${badgeCls}`}>
            {count} résultat{count > 1 ? 's' : ''}
          </span>
        )}
      </h3>
      <a href={externalHref} target="_blank" rel="noopener noreferrer" className={`text-xs hover:underline ${externalCls}`}>
        Voir sur {externalLabel} →
      </a>
    </div>
  );
}

export default function ResearchPanel({ givenNames, surname, birthYear, deathYear, birthPlace }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [wikiResults, setWikiResults] = useState<{ lang: string; result: WikiResult }[]>([]);
  const [maitronResults, setMaitronResults] = useState<MaitronResult[]>([]);
  const [wikidataResults, setWikidataResults] = useState<WikidataResult[]>([]);
  const [viafResults, setViafResults] = useState<ViafResult[]>([]);
  const [bnfResults, setBnfResults] = useState<BnfResult[]>([]);
  const [searched, setSearched] = useState(false);

  const firstName = givenNames.split(',')[0].trim();
  const fullName = `${firstName} ${surname}`.trim();
  const nameWithDates = `${fullName}${birthYear ? ` ${birthYear}` : ''}${deathYear ? `-${deathYear}` : ''}`;

  const runSearch = async () => {
    setLoading(true);
    const [frWiki, enWiki, maitronData, wikidataData, viafData, bnfData] = await Promise.all([
      searchWikipedia('fr', fullName),
      searchWikipedia('en', fullName),
      fetch(`/api/research/maitron?q=${encodeURIComponent(fullName)}`).then(r => r.json()),
      fetch(`/api/research/wikidata?q=${encodeURIComponent(fullName)}`).then(r => r.json()),
      fetch(`/api/research/viaf?q=${encodeURIComponent(fullName)}`).then(r => r.json()),
      fetch(`/api/research/bnf?q=${encodeURIComponent(fullName)}`).then(r => r.json()),
    ]);

    const combined: { lang: string; result: WikiResult }[] = [
      ...frWiki.map(r => ({ lang: 'fr', result: r })),
      ...enWiki.map(r => ({ lang: 'en', result: r })),
    ];
    const seen = new Set<string>();
    setWikiResults(combined.filter(({ result }) => {
      if (seen.has(result.title)) return false;
      seen.add(result.title);
      return true;
    }));
    setMaitronResults(maitronData.results ?? []);
    setWikidataResults(wikidataData.results ?? []);
    setViafResults(viafData.results ?? []);
    setBnfResults(bnfData.results ?? []);
    setSearched(true);
    setLoading(false);
  };

  const toggle = () => {
    setOpen(v => !v);
    if (!searched && !open) runSearch();
  };

  const maitronDirectUrl = `https://maitron.fr/recherche-avancee/?exp1_type1=and1&exp1_from1=full1&choix=2&typetri=triP&exp1=${encodeURIComponent(fullName)}&search=OK`;
  const bnfSearchUrl = `https://catalogue.bnf.fr/rechercher.do?index=TOUS3&texte=${encodeURIComponent(fullName)}`;
  const viafSearchUrl = `https://viaf.org/search#query=local.personalNames+all+"${encodeURIComponent(fullName)}"`;
  const wikidataSearchUrl = `https://www.wikidata.org/w/index.php?search=${encodeURIComponent(fullName)}&ns0=1`;

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
          <span className="text-xs text-slate-400 font-normal">Maitron, Wikipedia, Wikidata, VIAF, BnF…</span>
        </div>
        <svg className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-slate-100 dark:border-slate-800 px-6 py-5 space-y-6">

          {/* Maitron */}
          <div>
            <SectionHeader
              icon={<span className="w-5 h-5 rounded-full inline-flex items-center justify-center text-xs font-bold text-white" style={{ background: '#b91c1c' }}>M</span>}
              label="Maitron"
              loading={loading} searched={searched} count={maitronResults.length}
              badgeCls="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              externalHref={maitronDirectUrl} externalLabel="Maitron" externalCls="text-red-700"
            />
            {!loading && searched && maitronResults.length === 0 && (
              <p className="text-sm text-slate-400 py-1">Aucun résultat Maitron pour &laquo;{fullName}&raquo;.</p>
            )}
            {!loading && maitronResults.length > 0 && (
              <div className="space-y-2">
                {maitronResults.map((r) => (
                  <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer"
                    className="flex gap-3 p-3 rounded-lg border border-red-100 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors group">
                    <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-red-700 dark:text-red-400">M</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-red-800 dark:text-red-300 group-hover:underline leading-tight">{r.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">{r.excerpt}</p>
                    </div>
                    <ExtIcon className="text-red-300 group-hover:text-red-600" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Wikipedia */}
          <div>
            <SectionHeader
              icon={<span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 inline-flex items-center justify-center text-xs font-bold">W</span>}
              label="Wikipedia"
              loading={loading} searched={searched} count={wikiResults.length}
              badgeCls="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
              externalHref={`https://fr.wikipedia.org/w/index.php?search=${encodeURIComponent(fullName)}`}
              externalLabel="Wikipedia" externalCls="text-primary"
            />
            {!loading && searched && wikiResults.length === 0 && (
              <p className="text-sm text-slate-400 py-1">Aucun résultat Wikipedia pour &laquo;{fullName}&raquo;.</p>
            )}
            {!loading && wikiResults.length > 0 && (
              <div className="space-y-2">
                {wikiResults.map(({ lang, result }) => (
                  <a key={result.title}
                    href={result.content_urls?.desktop.page ?? `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(result.title)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-primary/30 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                    {result.thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={result.thumbnail.source} alt={result.title} className="w-14 h-14 object-cover rounded shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium group-hover:text-primary transition-colors">{result.title}</p>
                        <span className="text-xs text-slate-400 uppercase">{lang}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-3 leading-relaxed">{result.extract}</p>
                    </div>
                    <ExtIcon className="text-slate-300 group-hover:text-primary" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Wikidata */}
          <div>
            <SectionHeader
              icon={<span className="w-5 h-5 rounded-full inline-flex items-center justify-center text-xs font-bold text-white" style={{ background: '#006699' }}>Q</span>}
              label="Wikidata"
              loading={loading} searched={searched} count={wikidataResults.length}
              badgeCls="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              externalHref={wikidataSearchUrl} externalLabel="Wikidata" externalCls="text-blue-600"
            />
            {!loading && searched && wikidataResults.length === 0 && (
              <p className="text-sm text-slate-400 py-1">Aucun résultat Wikidata pour &laquo;{fullName}&raquo;.</p>
            )}
            {!loading && wikidataResults.length > 0 && (
              <div className="space-y-2">
                {wikidataResults.map((r) => (
                  <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer"
                    className="flex gap-3 p-3 rounded-lg border border-blue-100 dark:border-blue-900/30 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors group">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white" style={{ background: '#006699' }}>Q</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-300 group-hover:underline leading-tight">{r.label}</p>
                      {r.description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{r.description}</p>}
                      <p className="text-xs text-slate-400 mt-0.5">{r.id}</p>
                    </div>
                    <ExtIcon className="text-blue-300 group-hover:text-blue-600" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* VIAF */}
          <div>
            <SectionHeader
              icon={<span className="w-5 h-5 rounded-full inline-flex items-center justify-center text-xs font-bold text-white" style={{ background: '#7c3aed' }}>V</span>}
              label="VIAF — Autorités internationales"
              loading={loading} searched={searched} count={viafResults.length}
              badgeCls="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
              externalHref={viafSearchUrl} externalLabel="VIAF" externalCls="text-violet-600"
            />
            {!loading && searched && viafResults.length === 0 && (
              <p className="text-sm text-slate-400 py-1">Aucun résultat VIAF pour &laquo;{fullName}&raquo;.</p>
            )}
            {!loading && viafResults.length > 0 && (
              <div className="space-y-2">
                {viafResults.map((r) => (
                  <a key={r.viafid} href={r.url} target="_blank" rel="noopener noreferrer"
                    className="flex gap-3 p-3 rounded-lg border border-violet-100 dark:border-violet-900/30 hover:bg-violet-50 dark:hover:bg-violet-900/10 transition-colors group">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white" style={{ background: '#7c3aed' }}>V</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-violet-800 dark:text-violet-300 group-hover:underline leading-tight">{r.term}</p>
                      <p className="text-xs text-slate-400 mt-0.5">VIAF ID : {r.viafid}</p>
                    </div>
                    <ExtIcon className="text-violet-300 group-hover:text-violet-600" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* BnF Catalogue */}
          <div>
            <SectionHeader
              icon={<span className="w-5 h-5 rounded-full inline-flex items-center justify-center text-xs font-bold text-white" style={{ background: '#1e40af' }}>B</span>}
              label="BnF — Catalogue national"
              loading={loading} searched={searched} count={bnfResults.length}
              badgeCls="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
              externalHref={bnfSearchUrl} externalLabel="BnF" externalCls="text-blue-800"
            />
            {!loading && searched && bnfResults.length === 0 && (
              <p className="text-sm text-slate-400 py-1">Aucun résultat BnF pour &laquo;{fullName}&raquo;.</p>
            )}
            {!loading && bnfResults.length > 0 && (
              <div className="space-y-2">
                {bnfResults.map((r) => (
                  <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer"
                    className="flex gap-3 p-3 rounded-lg border border-blue-100 dark:border-blue-900/30 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors group">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white" style={{ background: '#1e40af' }}>B</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-300 group-hover:underline leading-tight line-clamp-2">{r.title}</p>
                      {(r.creator || r.date) && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{r.creator}{r.creator && r.date ? ' · ' : ''}{r.date}</p>
                      )}
                    </div>
                    <ExtIcon className="text-blue-300 group-hover:text-blue-700" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Autres sources */}
          <div>
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3">Autres sources</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EXTERNAL_SOURCES.map((source) => {
                const href = source.url(nameWithDates, surname, firstName);
                return (
                  <a key={source.label} href={href} target="_blank" rel="noopener noreferrer"
                    className="flex flex-col gap-0.5 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <span className="text-sm font-semibold" style={{ color: source.color }}>{source.label}</span>
                    <span className="text-xs text-slate-400 leading-tight">{source.description}</span>
                  </a>
                );
              })}
            </div>
          </div>

          {/* Search term info */}
          <p className="text-xs text-slate-400">
            Terme recherché : <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{fullName}</span>
            {birthPlace && <> · Lieu : <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{birthPlace}</span></>}
          </p>
        </div>
      )}
    </div>
  );
}
