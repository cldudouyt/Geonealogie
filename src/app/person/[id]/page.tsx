import { getSession } from '@/lib/session';
import { permits } from '@/lib/auth';
import PersonTabs from '@/components/PersonTabs';
import SourcesSection from '@/components/SourcesSection';
import { PersonJourney } from '@/components/PersonalJourney';
import { loadOverrides } from '@/lib/overrides-store';
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import ShareButton from '@/components/ui/ShareButton';

const EVENT_TYPE_FR: Record<string, string> = {
  'Military service': 'Service militaire',
  'Honors': 'Distinctions',
  'Religious marriage': 'Mariage religieux',
  'Residence': 'Résidence',
  'Title': 'Titre',
  'Travel': 'Voyage',
  'Post mortem': 'Post mortem',
};

function translateEventType(type: string): string {
  return EVENT_TYPE_FR[type] ?? type;
}

function toTitleCase(s: string): string {
  return s.toLowerCase().replace(/(?:^|\s)\S/g, c => c.toUpperCase());
}

function formatGivenNames(givenNames: string): string {
  const names = givenNames.replace(/,/g, '').trim().split(/\s+/).filter(Boolean);
  return names.join(' ');
}
import { getPerson, getParents, getChildren, getSpouses, getSiblings, formatPlaceFull } from '@/lib/gedcom-store';
import type { PersonRecord } from '@/lib/gedcom-store';

function generateBio(
  person: PersonRecord,
  parents: PersonRecord[],
  spouses: Array<{ person?: PersonRecord | null; marriageDateRaw?: string; marriagePlace?: string }>,
  children: PersonRecord[]
): string | null {
  const hasData = person.birthDateRaw || person.deathDateRaw || person.deathYear || spouses.some(s => s.person);
  if (!hasData) return null;
  const f = person.sex === 'F';
  const lines: string[] = [];

  const birthName = person.surname;
  let intro = `${person.givenNames.split(',')[0].trim()} ${birthName}`.trim();
  intro += ` est né${f ? 'e' : ''}`;
  if (person.birthDateRaw) intro += ` le ${person.birthDateRaw}`;
  if (person.birthPlaceFull || person.birthPlace) intro += ` à ${formatPlaceFull(person.birthPlaceFull) || person.birthPlace}`;
  if (parents.length > 0) intro += `, ${f ? 'fille' : 'fils'} de ${parents.map(p => p.displayName).join(' et ')}`;
  lines.push(intro);

  if (person.occupations.length > 0) {
    lines.push(`${f ? 'Elle exerçait la profession de' : 'Il exerçait la profession de'} ${person.occupations.join(', ').toLowerCase()}`);
  }

  for (const s of spouses) {
    if (!s.person) continue;
    let m = `${f ? 'Elle s\'est mariée avec' : 'Il s\'est marié avec'} ${s.person.displayName}`;
    if (s.marriageDateRaw) m += ` le ${s.marriageDateRaw}`;
    if (s.marriagePlace) m += ` à ${s.marriagePlace}`;
    lines.push(m);
  }

  if (children.length > 0) {
    const names = children.slice(0, 3).map(c => c.displayName).join(', ');
    const extra = children.length > 3 ? ` (et ${children.length - 3} autre${children.length - 3 > 1 ? 's' : ''})` : '';
    lines.push(`${f ? 'Elle a eu' : 'Il a eu'} ${children.length} enfant${children.length > 1 ? 's' : ''} : ${names}${extra}`);
  }

  if (person.deathDateRaw || person.deathYear || person.deathPlaceFull) {
    let d = `${f ? 'Elle est décédée' : 'Il est décédé'}`;
    if (person.deathDateRaw) d += ` le ${person.deathDateRaw}`;
    if (person.deathPlaceFull || person.deathPlace) d += ` à ${formatPlaceFull(person.deathPlaceFull) || person.deathPlace}`;
    if (person.birthYear && person.deathYear) {
      const age = parseInt(person.deathYear) - parseInt(person.birthYear);
      if (age > 0 && age < 120) d += `, à l'âge de $environ {age} ans`;
    }
    lines.push(d);
  }

  return lines.join('. ') + '.';
}
import type { MapMarker } from '@/components/map/PersonMap';
import PersonMapWrapper from '@/components/map/PersonMapWrapper';
import MigrationSection from '@/components/migration/MigrationSection';
import type { JourneyStop } from '@/components/migration/MigrationSection';
import DocumentsSection from '@/components/DocumentsSection';
import { getDocumentsForPerson } from '@/lib/documents-store';
import ResearchPanel from '@/components/ResearchPanel';
import { narrativeFingerprint } from '@/lib/narrative-facts';
import NarrativeSection from '@/components/NarrativeSection';
import { getNarrative } from '@/lib/narratives-store';

interface PersonPageProps {
  params: Promise<{ id: string }>;
}

export default async function PersonPage({ params }: PersonPageProps) {
  const { id } = await params;
  const session = await getSession();
  const canEdit = session && permits(session.role, 'contributor');

  const person = await getPerson(id);
  if (!person) {
    return (
      <div className="min-h-full flex items-center justify-center bg-[#f4f1ea]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#1c1f1c]" style={{ fontFamily: 'var(--font-serif, Georgia, serif)' }}>Personne introuvable</h1>
          <Link href="/" className="text-[#2f5142] underline mt-4 inline-block">Retour à l&apos;arbre</Link>
        </div>
      </div>
    );
  }

  const overrides = await loadOverrides();
  const sources = (overrides.newPersons.find(p => p.id === id) ?? overrides.persons[id])?.sources ?? [];
  const parents = await getParents(id);
  const children = await getChildren(id);
  const documents = await getDocumentsForPerson(id);
  const spouses = await getSpouses(id);
  const siblings = await getSiblings(id);
  const narrative = await getNarrative(id);

  // Resolve adoptive parents and adopted children for link display
  const adoptiveParents = person.adoptiveParentIds.length > 0
    ? (await Promise.all(person.adoptiveParentIds.map(pid => getPerson(pid)))).filter(Boolean) as PersonRecord[]
    : [];
  const adoptedChildren = person.adoptedChildIds.length > 0
    ? (await Promise.all(person.adoptedChildIds.map(cid => getPerson(cid)))).filter(Boolean) as PersonRecord[]
    : [];

  const heroGradient = person.sex === 'F'
    ? 'linear-gradient(135deg, #15271f 0%, #1e3a2f 60%, #3d5c4a 100%)'
    : 'linear-gradient(135deg, #15271f 0%, #1e3a2f 60%, #2f5142 100%)';
  const bio = generateBio(person, parents, spouses, children);

  // Build map markers for person + close relatives
  const mapMarkers: MapMarker[] = [];
  function addMarkers(p: PersonRecord) {
    if (p.birthLat != null && p.birthLon != null) {
      mapMarkers.push({
        lat: p.birthLat, lon: p.birthLon,
        label: p.displayName, surname: p.surname,
        eventType: 'birth', dateRaw: p.birthDateRaw, place: formatPlaceFull(p.birthPlaceFull) || p.birthPlace,
        personId: p.id,
      });
    }
    if (p.deathLat != null && p.deathLon != null) {
      mapMarkers.push({
        lat: p.deathLat, lon: p.deathLon,
        label: p.displayName, surname: p.surname,
        eventType: 'death', dateRaw: p.deathDateRaw, place: formatPlaceFull(p.deathPlaceFull) || p.deathPlace,
        personId: p.id,
      });
    }
  }
  addMarkers(person);
  parents.forEach(addMarkers);
  children.forEach(addMarkers);
  spouses.forEach(s => s.person && addMarkers(s.person as PersonRecord));
  siblings.forEach(addMarkers);

  // Add life event markers for the main person
  for (const evt of person.events) {
    if (evt.lat != null && evt.lon != null) {
      mapMarkers.push({
        lat: evt.lat, lon: evt.lon,
        label: person.displayName, surname: '',
        eventType: 'event', eventLabel: evt.type,
        dateRaw: evt.dateRaw, place: formatPlaceFull(evt.placeFull) || evt.place,
        personId: person.id,
      });
    }
  }

  // Build life journey stops for migration section (sorted chronologically)
  function extractStopYear(dateRaw?: string): number {
    if (!dateRaw) return 9999;
    const m = dateRaw.match(/\b(\d{4})\b/);
    return m ? parseInt(m[1]) : 9999;
  }
  const TYPE_ORDER: Record<string, number> = { birth: -1, event: 0, death: 1, burial: 2 };

  const journeyStops: JourneyStop[] = [];
  if (person.birthDateRaw || person.birthPlaceFull || person.birthPlace) {
    journeyStops.push({
      type: 'birth', label: 'Naissance',
      dateRaw: person.birthDateRaw,
      place: formatPlaceFull(person.birthPlaceFull) || person.birthPlace,
      lat: person.birthLat != null ? Number(person.birthLat) : null,
      lon: person.birthLon != null ? Number(person.birthLon) : null,
    });
  }
  for (const evt of person.events) {
    if (evt.dateRaw || evt.place || evt.placeFull) {
      journeyStops.push({
        type: 'event', label: translateEventType(evt.type),
        dateRaw: evt.dateRaw,
        place: formatPlaceFull(evt.placeFull) || evt.place,
        lat: evt.lat != null ? Number(evt.lat) : null,
        lon: evt.lon != null ? Number(evt.lon) : null,
      });
    }
  }
  if (person.deathDateRaw || person.deathPlaceFull || person.deathPlace) {
    journeyStops.push({
      type: 'death', label: 'Décès',
      dateRaw: person.deathDateRaw,
      place: formatPlaceFull(person.deathPlaceFull) || person.deathPlace,
      lat: person.deathLat != null ? Number(person.deathLat) : null,
      lon: person.deathLon != null ? Number(person.deathLon) : null,
    });
  }
  if (person.burialDateRaw || person.burialPlace) {
    journeyStops.push({
      type: 'burial', label: 'Inhumation',
      dateRaw: person.burialDateRaw,
      place: person.burialPlace,
      lat: null, lon: null,
    });
  }
  journeyStops.sort((a, b) => {
    const yearDiff = extractStopYear(a.dateRaw) - extractStopYear(b.dateRaw);
    if (yearDiff !== 0) return yearDiff;
    return (TYPE_ORDER[a.type] ?? 0) - (TYPE_ORDER[b.type] ?? 0);
  });

  // Build chronological timeline
  const timeline: Array<{ label: string; dateRaw?: string; place?: string; icon: string; note?: string }> = [];

  if (person.chrDateRaw || person.chrPlace) {
    timeline.push({ label: 'Baptême', dateRaw: person.chrDateRaw, place: person.chrPlace, icon: '✦' });
  }
  if (person.birthDateRaw || person.birthPlaceFull) {
    timeline.push({ label: 'Naissance', dateRaw: person.birthDateRaw, place: formatPlaceFull(person.birthPlaceFull) || person.birthPlace, icon: '★' });
  }
  for (const evt of person.events) {
    timeline.push({ label: translateEventType(evt.type), dateRaw: evt.dateRaw, place: formatPlaceFull(evt.placeFull) || evt.place, icon: '◆', note: evt.note });
  }
  if (person.deathDateRaw || person.deathPlaceFull) {
    timeline.push({ label: 'Décès', dateRaw: person.deathDateRaw, place: formatPlaceFull(person.deathPlaceFull) || person.deathPlace, icon: '†' });
  }
  if (person.burialDateRaw || person.burialPlace) {
    timeline.push({ label: 'Inhumation', dateRaw: person.burialDateRaw, place: person.burialPlace, icon: '⚰' });
  }

  // Initials for avatar fallback
  const initials = person.displayName.split(' ').filter(Boolean).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() || '?';

  return (
    <div className="min-h-full bg-[#f4f1ea]">
      {/* Hero header */}
      <div className="relative overflow-hidden" style={{ background: heroGradient, minHeight: '260px' }}>
        {/* Blurred photo background */}
        {person.photoUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={person.photoUrl}
              alt=""
              aria-hidden
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(12px)', transform: 'scale(1.1)', opacity: 0.45 }}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 100%)' }} />
          </>
        )}

        {/* Subtle texture overlay */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.04\'%3E%3Cpath d=\'M0 0h40v40H0z\' fill=\'none\'/%3E%3Ccircle cx=\'20\' cy=\'20\' r=\'1\'/%3E%3C/g%3E%3C/svg%3E")', pointerEvents: 'none' }} />

        {/* Actions bar */}
        <div className="relative z-10 flex items-center justify-between px-4 pt-4 gap-2">
          <Link href="/" className="flex items-center gap-1.5 text-white/75 hover:text-white text-sm transition-colors shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Accueil</span>
          </Link>
          <div className="flex items-center gap-1.5">
            <ShareButton personId={id} />
            <Link
              href={`/person/${id}/print`}
              target="_blank"
              className="p-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-sm font-medium transition-colors flex items-center backdrop-blur-sm"
              title="Télécharger PDF"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              <span className="hidden sm:inline ml-1">PDF</span>
            </Link>
            {canEdit && <Link
              href={`/person/${id}/edit`}
              className="p-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-sm font-medium transition-colors flex items-center backdrop-blur-sm"
              title="Éditer la fiche"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span className="hidden sm:inline ml-1">Éditer</span>
            </Link>}
            <Link
              href={`/feedback/new?person=${id}&name=${encodeURIComponent(person.displayName)}`}
              className="p-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-sm font-medium transition-colors flex items-center backdrop-blur-sm"
              title="Suggérer une correction"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="hidden sm:inline ml-1">Suggérer</span>
            </Link>
            <Link
              href={`/tree?focus=${id}`}
              className="px-3 py-1.5 bg-white text-[#1e3a2f] rounded-lg text-sm font-semibold hover:bg-white/90 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Arbre
            </Link>
          </div>
        </div>

        {/* Hero identity */}
        <div className="relative z-10 px-6 pb-8 pt-6 flex items-end gap-5">
          {/* Avatar */}
          {person.photoUrl ? (
            <div style={{ borderRadius: '50%', overflow: 'hidden', width: 88, height: 88, border: '3px solid rgba(255,255,255,0.5)', flexShrink: 0, boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={person.photoUrl} alt={person.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ) : (
            <div style={{ borderRadius: '50%', width: 88, height: 88, background: 'rgba(255,255,255,0.18)', border: '3px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 700, color: 'rgba(255,255,255,0.92)', flexShrink: 0, boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
              {initials}
            </div>
          )}

          {/* Name + meta */}
          <div style={{ paddingBottom: 4 }}>
            {/* Eyebrow — lignée */}
            {person.surname && (
              <p style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: '#9fb0a1', marginBottom: 7, margin: '0 0 7px' }}>
                Lignée {person.surname}
              </p>
            )}
            <h1 style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: '2rem', fontWeight: 700, color: 'white', margin: 0, lineHeight: 1.2, textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}>
              {formatGivenNames(person.givenNames)} {person.surname}
            </h1>
            {/* Meta line: birth place (dept) · occupation · age */}
            {(person.birthPlace || person.occupations.length > 0 || person.birthYear) && (() => {
              const placeParts = person.birthPlaceFull?.split(',').map((s: string) => s.trim()) ?? [];
              const dept = placeParts[2] || undefined;
              const country = placeParts[4] || undefined;
              const isFrance = !country || country.toLowerCase().includes('france');
              const placeLabel = person.birthPlace
                ? (dept && isFrance ? `${person.birthPlace} (${dept})` : person.birthPlace)
                : null;
              const occupation = person.occupations.length > 0 ? toTitleCase(person.occupations[0]) : null;
              const age = (() => {
                if (!person.birthYear) return null;
                const endYear = person.deathYear ? parseInt(person.deathYear) : new Date().getFullYear();
                const a = endYear - parseInt(person.birthYear);
                return a > 0 && a < 150 ? a : null;
              })();
              return (
                <p style={{ color: '#aebaae', margin: '6px 0 0', fontSize: '0.85rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0 6px' }}>
                  {placeLabel && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                      {placeLabel}
                    </span>
                  )}
                  {occupation && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {placeLabel && <span aria-hidden="true" style={{ opacity: 0.5 }}>·</span>}
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
                      {occupation}
                    </span>
                  )}
                  {age !== null && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {(placeLabel || occupation) && <span aria-hidden="true" style={{ opacity: 0.5 }}>·</span>}
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      environ {age} ans
                    </span>
                  )}
                </p>
              );
            })()}
            {person.nickname && (
              <p style={{ color: 'rgba(255,255,255,0.6)', margin: '3px 0 0', fontSize: '0.85rem', fontStyle: 'italic' }}>
                &ldquo;{person.nickname}&rdquo;
              </p>
            )}
            {person.isAdopted && (
              <span style={{ display: 'inline-block', marginTop: 6, fontSize: '0.75rem', padding: '2px 8px', borderRadius: 9999, background: 'rgba(217,119,6,0.7)', color: 'white', fontWeight: 600 }}>
                Adopté{person.sex === 'F' ? 'e' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto p-6">

<PersonJourney id={id} name={person.displayName} />
        <PersonTabs panels={[
          <>        {/* Bio narrative */}
        {bio && (
          <div className="bg-[#f1f4ef] border border-[#dde5da] rounded-2xl px-6 py-4 mb-6">
            <p className="text-sm text-[#3f4a41] leading-relaxed italic" style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: '0.95rem' }}>{bio}</p>
          </div>
        )}

        {/* AI-generated portrait */}
        <NarrativeSection key={id} personId={id} initial={narrative} fingerprint={narrativeFingerprint(person, sources)} />

        {/* Timeline */}
        {timeline.length > 0 && (
          <div className="bg-[#fffdf9] border border-[#e7e0d0] rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-5 text-[#1c1f1c]" style={{ fontFamily: 'var(--font-serif, Georgia, serif)' }}>Chronologie</h2>
            <ol className="relative border-l-2 border-[#e9e2d2] space-y-5 ml-3">
              {timeline.map((item, i) => (
                <li key={i} className="ml-6">
                  <span className="absolute -left-3 flex items-center justify-center w-6 h-6 bg-[#eef2ec] rounded-full text-[#2f5142] text-xs">
                    {item.icon}
                  </span>
                  <div>
                    <p className="font-medium text-[#1c1f1c] text-sm">{item.label}</p>
                    {sources.filter(source => source.event === item.label || source.event === [item.label, item.dateRaw].filter(Boolean).join(' · ')).map(source => <span key={source.id} className={`certainty certainty-${source.confidence}`}>{source.confidence === 'confirmed' ? 'Source confirmée' : source.confidence === 'approximate' ? 'Date approximative' : 'À vérifier'} · voir Sources</span>)}
                    <p className="text-xs text-[#6c7064]">
                      {item.dateRaw && <span>{item.dateRaw}</span>}
                      {item.dateRaw && item.place && <span> — </span>}
                      {item.place && <span>{item.place}</span>}
                    </p>
                    {item.note && (
                      item.note.length > 250 ? (
                        <details className="mt-1">
                          <summary className="text-xs text-[#2f5142] cursor-pointer hover:text-[#c9a86a] select-none">Voir la note…</summary>
                          <p className="text-xs text-[#6c7064] mt-1 whitespace-pre-wrap leading-relaxed">{item.note}</p>
                        </details>
                      ) : (
                        <p className="text-xs text-[#6c7064] mt-1 whitespace-pre-wrap leading-relaxed">{item.note}</p>
                      )
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Biographical notes */}
        {person.notes && (
          <div className="bg-[#fffdf9] border border-[#e7e0d0] rounded-2xl p-6 mt-6">
            <h2 className="text-lg font-semibold mb-4 text-[#1c1f1c]" style={{ fontFamily: 'var(--font-serif, Georgia, serif)' }}>Notes biographiques</h2>
            <p className="text-sm text-[#5a5e52] whitespace-pre-wrap leading-relaxed">{person.notes}</p>
          </div>
        )}

</>,
          <><h2 className="section-heading">Famille proche</h2>{!parents.length && !children.length && !spouses.length && !siblings.length && !adoptiveParents.length && !adoptedChildren.length && <p className="empty-state">Aucun lien de parenté renseigné pour cette personne.</p>}        {/* Family */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(parents.length > 0 || adoptiveParents.length > 0) && (
            <div className="bg-[#fffdf9] border border-[#e7e0d0] rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4 text-[#1c1f1c]" style={{ fontFamily: 'var(--font-serif, Georgia, serif)' }}>Parents</h2>
              <div className="space-y-2">
                {parents.map(p => <PersonListItem key={p.id} person={p} />)}
                {adoptiveParents.map(p => <PersonListItem key={p.id} person={p} badge="adoptif" />)}
              </div>
            </div>
          )}
          {siblings.length > 0 && <FamilySection title="Fratrie" persons={siblings} />}
          {spouses.length > 0 && (
            <div className="bg-[#fffdf9] border border-[#e7e0d0] rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4 text-[#1c1f1c]" style={{ fontFamily: 'var(--font-serif, Georgia, serif)' }}>Conjoints</h2>
              <div className="space-y-4">
                {spouses.map((s) => s.person && (
                  <div key={s.familyId}>
                    <PersonListItem person={s.person} />
                    <div className="ml-5 mt-1 space-y-0.5">
                      {s.marriageDateRaw && (
                        <p className="text-xs text-[#6c7064]">
                          Mariage : {s.marriageDateRaw}{s.marriagePlace && ` — ${s.marriagePlace}`}
                        </p>
                      )}
                      {s.divorceDateRaw && (
                        <p className="text-xs text-[#6c7064]">
                          Divorce : {s.divorceDateRaw}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(children.length > 0 || adoptedChildren.length > 0) && (
            <div className="bg-[#fffdf9] border border-[#e7e0d0] rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4 text-[#1c1f1c]" style={{ fontFamily: 'var(--font-serif, Georgia, serif)' }}>Enfants</h2>
              <div className="space-y-2">
                {children.map(p => <PersonListItem key={p.id} person={p} />)}
                {adoptedChildren.map(p => <PersonListItem key={p.id} person={p} badge="adoptif" />)}
              </div>
            </div>
          )}
        </div>

</>,
          <><h2 className="section-heading">Lieux de vie</h2>        {/* Migration / life journey — pass coords as JSON string to bypass RSC number serialization bug */}
        <MigrationSection stops={journeyStops} personId={id} stopsJson={JSON.stringify(journeyStops)} />

        {/* Map — relatives context */}
        {mapMarkers.length > 0 && (
          <div className="bg-[#fffdf9] border border-[#e7e0d0] rounded-2xl p-6 mb-6 mt-6">
            <h2 className="text-lg font-semibold mb-4 text-[#1c1f1c]" style={{ fontFamily: 'var(--font-serif, Georgia, serif)' }}>Carte — famille proche</h2>
            <PersonMapWrapper markers={mapMarkers} centerId={id} />
          </div>
        )}

</>,
          <><SourcesSection id={id} sources={sources} documents={documents} events={Array.from(new Set(timeline.map(e => [e.label, e.dateRaw].filter(Boolean).join(' · '))))} />
        {/* Online research */}
        <ResearchPanel
          givenNames={person.givenNames}
          surname={person.surname}
          birthYear={person.birthYear}
          deathYear={person.deathYear}
          birthPlace={person.birthPlace}
        />

        {/* Documents */}
        <DocumentsSection personId={id} initialDocs={documents} />
</>
        ]} />
      </main>
    </div>
  );
}

function FamilySection({ title, persons }: { title: string; persons: PersonRecord[] }) {
  return (
    <div className="bg-[#fffdf9] border border-[#e7e0d0] rounded-2xl p-6">
      <h2 className="text-lg font-semibold mb-4 text-[#1c1f1c]" style={{ fontFamily: 'var(--font-serif, Georgia, serif)' }}>{title}</h2>
      <div className="space-y-2">
        {persons.map(p => <PersonListItem key={p.id} person={p} />)}
      </div>
    </div>
  );
}

function PersonListItem({ person, badge }: { person: PersonRecord; badge?: string }) {
  const dot = person.sex === 'M' ? 'bg-male' : person.sex === 'F' ? 'bg-female' : 'bg-neutral';
  return (
    <Link
      href={`/person/${person.id}`}
      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#f1f4ef] transition-colors group"
    >
      <span className={`w-2.5 h-2.5 rounded-full ${dot} shrink-0`} />
      <span className="text-sm text-[#1c1f1c] group-hover:text-[#2f5142] transition-colors">{person.displayName}</span>
      {badge && <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#f7e6d6] text-[#b5651d]">{badge}</span>}
      {person.birthYear && <span className="text-xs text-[#9aa89b] ml-auto">{person.birthYear}</span>}
    </Link>
  );
}
