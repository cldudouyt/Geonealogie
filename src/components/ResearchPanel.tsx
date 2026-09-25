'use client';

import { useRef, useState } from 'react';
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
    label: 'FamilySearch',
    description: 'Registres généalogiques mondiaux',
    color: '#1d4ed8',
    url: (_q: string, surname: string, given: string) =>
      `https://www.familysearch.org/fr/search/record/results?q.givenName=${encodeURIComponent(given)}&q.surname=${encodeURIComponent(surname)}`,
  },
  {
    label: 'Filae',
    description: 'Archives civiles françaises',
    color: '#7c3aed',
    url: (_q: string, surname: string, given: string) =>
      `https://www.filae.com/v4/genealogie/search.html?firstname=${encodeURIComponent(given)}&lastname=${encodeURIComponent(surname)}`,
  },
  {
    label: 'Geni',
    description: 'Arbre généalogique mondial',
    color: '#c2410c',
    url: (q: string) => `https://www.geni.com/search?names=${encodeURIComponent(q)}`,
  },
  {
    label: 'Archives nationales',
    description: 'Fonds publics français',
    color: '#92400e',
    url: (q: string) => `https://www.siv.archives-nationales.culture.gouv.fr/siv/rechercheSimple/${encodeURIComponent(q)}`,
  },
  {
    label: 'Google Scholar',
    description: 'Publications académiques',
    color: '#0369a1',
    url: (q: string) => `https://scholar.google.fr/scholar?q=${encodeURIComponent(q)}`,
  },
];

const CLIENT_TIMEOUT_MS = 10000;
const UNAVAILABLE = 'Source indisponible, réessayez plus tard.';

type SourceKey = 'maitron' | 'wikipedia' | 'wikidata' | 'viaf' | 'bnf';
type SourceErrors = Partial<Record<SourceKey, boolean>>;

async function searchWikipedia(lang: 'fr' | 'en', name: string): Promise<WikiResult[]> {
  const signal = AbortSignal.timeout(CLIENT_TIMEOUT_MS);
  const searchRes = await fetch(
    `https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(name)}&limit=3&format=json&origin=*`,
    { signal }
  );
  if (!searchRes.ok) throw new Error('Wikipedia indisponible');
  const [, titles] = await searchRes.json() as [string, string[], string[], string[]];
  if (!titles?.length) return [];

  const results = await Promise.all(
    titles.slice(0, 2).map(async (title) => {
      try {
        const res = await fetch(
          `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
          { headers: { 'Api-User-Agent': 'Geonealogie/1.0' }, signal }
        );
        if (!res.ok) return null;
        return await res.json() as WikiResult;
      } catch { return null; }
    })
  );
  return results.filter(Boolean) as WikiResult[];
}

async function fetchSource<T>(url: string): Promise<T[]> {
  const r = await fetch(url, { signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS) });
  const data = await r.json().catch(() => null) as { results?: T[]; error?: string } | null;
  if (!r.ok || !data || data.error || !Array.isArray(data.results)) throw new Error(data?.error || UNAVAILABLE);
  return data.results;
}

function SourceStatus({ loading, searched, failed, count, source, name }: { loading: boolean; searched: boolean; failed?: boolean; count: number; source: string; name: string }) {
  if (loading || !searched) return null;
  if (failed) return <p role="status" className="text-sm text-[#9c5a52] py-1">{source} : {UNAVAILABLE}</p>;
  if (count === 0) return <p className="text-sm text-[#8a8474] py-1">Aucun résultat {source} pour &laquo;{name}&raquo;.</p>;
  return null;
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
      <h3 className="text-sm font-semibold text-[#5a5e52] flex items-center gap-2">
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
  const [errors, setErrors] = useState<SourceErrors>({});
  const inFlight = useRef(false);

  const firstName = givenNames.split(',')[0].trim();
  const fullName = `${firstName} ${surname}`.trim();
  const nameWithDates = `${fullName}${birthYear ? ` ${birthYear}` : ''}${deathYear ? `-${deathYear}` : ''}`;

  const query = new URLSearchParams({ q: fullName, given: firstName, surname: surname.trim() }).toString();

  const runSearch = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    try {
      const [frWiki, enWiki, maitron, wikidata, viaf, bnf] = await Promise.allSettled([
        searchWikipedia('fr', fullName),
        searchWikipedia('en', fullName),
        fetchSource<MaitronResult>(`/api/research/maitron?${query}`),
        fetchSource<WikidataResult>(`/api/research/wikidata?${query}`),
        fetchSource<ViafResult>(`/api/research/viaf?${query}`),
        fetchSource<BnfResult>(`/api/research/bnf?${query}`),
      ]);
      const value = <T,>(r: PromiseSettledResult<T[]>): T[] => r.status === 'fulfilled' ? r.value : [];
      setErrors({
        wikipedia: frWiki.status === 'rejected' && enWiki.status === 'rejected',
        maitron: maitron.status === 'rejected',
        wikidata: wikidata.status === 'rejected',
        viaf: viaf.status === 'rejected',
        bnf: bnf.status === 'rejected',
      });

      const combined: { lang: string; result: WikiResult }[] = [
        ...value(frWiki).map((r: WikiResult) => ({ lang: 'fr', result: r })),
        ...value(enWiki).map((r: WikiResult) => ({ lang: 'en', result: r })),
      ];
      const seen = new Set<string>();
      setWikiResults(combined.filter(({ result }) => {
        if (seen.has(result.title)) return false;
        seen.add(result.title);
        return true;
      }));
      setMaitronResults(value(maitron));
      setWikidataResults(value(wikidata));
      setViafResults(value(viaf));
      setBnfResults(value(bnf));
    } finally {
      inFlight.current = false;
      setSearched(true);
      setLoading(false);
    }
  };

  const toggle = () => {
    setOpen(v => !v);
    if (!searched && !open && !loading) runSearch();
  };

  const maitronDirectUrl = `https://maitron.fr/?s=${encodeURIComponent(fullName)}`;
  const bnfSearchUrl = `https://catalogue.bnf.fr/rechercher.do?index=TOUS3&texte=${encodeURIComponent(fullName)}`;
  const viafSearchUrl = `https://viaf.org/search#query=local.personalNames+all+"${encodeURIComponent(fullName)}"`;
  const wikidataSearchUrl = `https://www.wikidata.org/w/index.php?search=${encodeURIComponent(fullName)}&ns0=1`;

  return (
    <div className="bg-[#fffdf9] border border-[#e7e0d0] rounded-2xl overflow-hidden mt-6">
      <div className="flex items-center justify-between px-6 py-4">
        <button
          onClick={toggle}
          className="flex items-center gap-2 flex-1 text-left hover:opacity-80 transition-opacity"
        >
          <svg className="w-5 h-5 text-[#8a8474]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h2 className="text-base font-semibold text-[#1c1f1c]" style={{ fontFamily: 'var(--font-serif, Georgia, serif)' }}>Recherche en ligne</h2>
          <span className="text-xs text-[#9aa89b] font-normal hidden sm:inline">Maitron, Wikipedia, Wikidata, VIAF, BnF…</span>
          <svg className={`w-4 h-4 text-[#9aa89b] transition-transform ml-auto ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {searched && !loading && (
          <button
            type="button"
            onClick={() => { setSearched(false); runSearch(); }}
            style={{ marginLeft: 12, padding: '6px 12px', background: '#eef2ec', color: '#2f5142', borderRadius: 8, fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}
            title="Relancer la recherche"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualiser
          </button>
        )}
      </div>

      {open && (
        <div className="border-t border-[#f1ebdd] px-6 py-5 space-y-6">

          {/* Maitron */}
          <div>
            <SectionHeader
              icon={<span className="w-5 h-5 rounded-full inline-flex items-center justify-center text-xs font-bold text-white" style={{ background: '#b91c1c' }}>M</span>}
              label="Maitron"
              loading={loading} searched={searched} count={maitronResults.length}
              badgeCls="bg-red-100 text-red-700"
              externalHref={maitronDirectUrl} externalLabel="Maitron" externalCls="text-red-700"
            />
            <SourceStatus loading={loading} searched={searched} failed={errors.maitron} count={maitronResults.length} source="Maitron" name={fullName} />
            {!loading && maitronResults.length > 0 && (
              <div className="space-y-2">
                {maitronResults.map((r) => (
                  <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer"
                    className="flex gap-3 p-3 rounded-lg border border-red-100 hover:bg-red-50 transition-colors group">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-red-700">M</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-red-800 group-hover:underline leading-tight">
                        {r.title}
                        {r.namesake && (
                          <span className="ml-2 align-middle text-[11px] font-medium px-1.5 py-0.5 rounded-full bg-[#f6ecd9] text-[#7a5a1f] no-underline inline-block" title="Même nom de famille : il peut s’agir d’une autre personne.">homonyme possible</span>
                        )}
                      </p>
                      <p className="text-xs text-[#8a8474] mt-1 line-clamp-2 leading-relaxed">{r.excerpt}</p>
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
              icon={<span className="w-5 h-5 rounded-full bg-[#eef2ec] text-[#2f5142] inline-flex items-center justify-center text-xs font-bold">W</span>}
              label="Wikipedia"
              loading={loading} searched={searched} count={wikiResults.length}
              badgeCls="bg-[#eef2ec] text-[#2f5142]"
              externalHref={`https://fr.wikipedia.org/w/index.php?search=${encodeURIComponent(fullName)}`}
              externalLabel="Wikipedia" externalCls="text-[#2f5142]"
            />
            <SourceStatus loading={loading} searched={searched} failed={errors.wikipedia} count={wikiResults.length} source="Wikipedia" name={fullName} />
            {!loading && wikiResults.length > 0 && (
              <div className="space-y-2">
                {wikiResults.map(({ lang, result }) => (
                  <a key={result.title}
                    href={result.content_urls?.desktop.page ?? `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(result.title)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex gap-3 p-3 rounded-lg border border-[#e9e2d2] hover:border-[#c9a86a] hover:bg-[#f1f4ef] transition-colors group">
                    {result.thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={result.thumbnail.source} alt={result.title} className="w-14 h-14 object-cover rounded shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-[#1c1f1c] group-hover:text-[#2f5142] transition-colors">{result.title}</p>
                        <span className="text-xs text-[#9aa89b] uppercase">{lang}</span>
                      </div>
                      <p className="text-xs text-[#8a8474] mt-1 line-clamp-3 leading-relaxed">{result.extract}</p>
                    </div>
                    <ExtIcon className="text-[#d6bd8e] group-hover:text-[#2f5142]" />
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
              badgeCls="bg-blue-100 text-blue-700"
              externalHref={wikidataSearchUrl} externalLabel="Wikidata" externalCls="text-blue-600"
            />
            <SourceStatus loading={loading} searched={searched} failed={errors.wikidata} count={wikidataResults.length} source="Wikidata" name={fullName} />
            {!loading && wikidataResults.length > 0 && (
              <div className="space-y-2">
                {wikidataResults.map((r) => (
                  <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer"
                    className="flex gap-3 p-3 rounded-lg border border-blue-100 hover:bg-blue-50 transition-colors group">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white" style={{ background: '#006699' }}>Q</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-blue-800 group-hover:underline leading-tight">{r.label}</p>
                      {r.description && <p className="text-xs text-[#8a8474] mt-1 leading-relaxed">{r.description}</p>}
                      <p className="text-xs text-[#9aa89b] mt-0.5">{r.id}</p>
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
              badgeCls="bg-violet-100 text-violet-700"
              externalHref={viafSearchUrl} externalLabel="VIAF" externalCls="text-violet-600"
            />
            <SourceStatus loading={loading} searched={searched} failed={errors.viaf} count={viafResults.length} source="VIAF" name={fullName} />
            {!loading && viafResults.length > 0 && (
              <div className="space-y-2">
                {viafResults.map((r) => (
                  <a key={r.viafid} href={r.url} target="_blank" rel="noopener noreferrer"
                    className="flex gap-3 p-3 rounded-lg border border-violet-100 hover:bg-violet-50 transition-colors group">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white" style={{ background: '#7c3aed' }}>V</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-violet-800 group-hover:underline leading-tight">{r.term}</p>
                      <p className="text-xs text-[#9aa89b] mt-0.5">VIAF ID : {r.viafid}</p>
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
              badgeCls="bg-blue-100 text-blue-800"
              externalHref={bnfSearchUrl} externalLabel="BnF" externalCls="text-blue-800"
            />
            <SourceStatus loading={loading} searched={searched} failed={errors.bnf} count={bnfResults.length} source="BnF" name={fullName} />
            {!loading && bnfResults.length > 0 && (
              <div className="space-y-2">
                {bnfResults.map((r) => (
                  <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer"
                    className="flex gap-3 p-3 rounded-lg border border-blue-100 hover:bg-blue-50 transition-colors group">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white" style={{ background: '#1e40af' }}>B</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-blue-900 group-hover:underline leading-tight line-clamp-2">{r.title}</p>
                      {(r.creator || r.date) && (
                        <p className="text-xs text-[#8a8474] mt-1">{r.creator}{r.creator && r.date ? ' · ' : ''}{r.date}</p>
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
            <h3 className="text-sm font-semibold text-[#5a5e52] mb-3">Autres sources</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EXTERNAL_SOURCES.map((source) => {
                const href = source.url(nameWithDates, surname, firstName);
                return (
                  <a key={source.label} href={href} target="_blank" rel="noopener noreferrer"
                    className="flex flex-col gap-0.5 px-3 py-2.5 rounded-lg border border-[#e0d8c6] bg-[#fffdf9] hover:bg-[#f1f4ef] transition-colors">
                    <span className="text-sm font-semibold" style={{ color: source.color }}>{source.label}</span>
                    <span className="text-xs text-[#9aa89b] leading-tight">{source.description}</span>
                  </a>
                );
              })}
            </div>
          </div>

          {/* Search term info */}
          <p className="text-xs text-[#8a8474]">
            Terme recherché : <span className="font-mono bg-[#f1ece0] px-1.5 py-0.5 rounded">{fullName}</span>
            {birthPlace && <> · Lieu : <span className="font-mono bg-[#f1ece0] px-1.5 py-0.5 rounded">{birthPlace}</span></>}
          </p>
        </div>
      )}
    </div>
  );
}
