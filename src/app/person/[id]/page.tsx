export const dynamic = 'force-dynamic';

import Link from 'next/link';
import ShareButton from '@/components/ui/ShareButton';
import { getPerson, getParents, getChildren, getSpouses, getSiblings } from '@/lib/gedcom-store';
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
  if (person.birthPlaceFull || person.birthPlace) intro += ` à ${person.birthPlaceFull || person.birthPlace}`;
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
    if (person.deathPlaceFull || person.deathPlace) d += ` à ${person.deathPlaceFull || person.deathPlace}`;
    if (person.birthYear && person.deathYear) {
      const age = parseInt(person.deathYear) - parseInt(person.birthYear);
      if (age > 0 && age < 120) d += `, à l'âge de ${age} ans`;
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

interface PersonPageProps {
  params: Promise<{ id: string }>;
}

export default async function PersonPage({ params }: PersonPageProps) {
  const { id } = await params;

  const person = await getPerson(id);
  if (!person) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Personne introuvable</h1>
          <Link href="/" className="text-blue-600 mt-4 inline-block">Retour à l&apos;arbre</Link>
        </div>
      </div>
    );
  }

  const parents = await getParents(id);
  const children = await getChildren(id);
  const documents = await getDocumentsForPerson(id);
  const spouses = await getSpouses(id);
  const siblings = await getSiblings(id);

  // Resolve adoptive parents and adopted children for link display
  const adoptiveParents = person.adoptiveParentIds.length > 0
    ? (await Promise.all(person.adoptiveParentIds.map(pid => getPerson(pid)))).filter(Boolean) as PersonRecord[]
    : [];
  const adoptedChildren = person.adoptedChildIds.length > 0
    ? (await Promise.all(person.adoptedChildIds.map(cid => getPerson(cid)))).filter(Boolean) as PersonRecord[]
    : [];

  const heroGradient = person.sex === 'M'
    ? 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 60%, #2563eb 100%)'
    : person.sex === 'F'
      ? 'linear-gradient(135deg, #831843 0%, #be185d 60%, #ec4899 100%)'
      : 'linear-gradient(135deg, #1e293b 0%, #334155 60%, #475569 100%)';
  const bio = generateBio(person, parents, spouses, children);

  // Build map markers for person + close relatives
  const mapMarkers: MapMarker[] = [];
  function addMarkers(p: PersonRecord) {
    if (p.birthLat != null && p.birthLon != null) {
      mapMarkers.push({
        lat: p.birthLat, lon: p.birthLon,
        label: p.displayName, surname: p.surname,
        eventType: 'birth', dateRaw: p.birthDateRaw, place: p.birthPlaceFull,
        personId: p.id,
      });
    }
    if (p.deathLat != null && p.deathLon != null) {
      mapMarkers.push({
        lat: p.deathLat, lon: p.deathLon,
        label: p.displayName, surname: p.surname,
        eventType: 'death', dateRaw: p.deathDateRaw, place: p.deathPlaceFull,
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
        dateRaw: evt.dateRaw, place: evt.placeFull || evt.place,
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
      place: person.birthPlaceFull || person.birthPlace,
      lat: person.birthLat != null ? Number(person.birthLat) : null,
      lon: person.birthLon != null ? Number(person.birthLon) : null,
    });
  }
  for (const evt of person.events) {
    if (evt.dateRaw || evt.place || evt.placeFull) {
      journeyStops.push({
        type: 'event', label: evt.type,
        dateRaw: evt.dateRaw,
        place: evt.placeFull || evt.place,
        lat: evt.lat != null ? Number(evt.lat) : null,
        lon: evt.lon != null ? Number(evt.lon) : null,
      });
    }
  }
  if (person.deathDateRaw || person.deathPlaceFull || person.deathPlace) {
    journeyStops.push({
      type: 'death', label: 'Décès',
      dateRaw: person.deathDateRaw,
      place: person.deathPlaceFull || person.deathPlace,
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
    timeline.push({ label: 'Naissance', dateRaw: person.birthDateRaw, place: person.birthPlaceFull, icon: '★' });
  }
  for (const evt of person.events) {
    timeline.push({ label: evt.type, dateRaw: evt.dateRaw, place: evt.placeFull || evt.place, icon: '◆', note: evt.note });
  }
  if (person.deathDateRaw || person.deathPlaceFull) {
    timeline.push({ label: 'Décès', dateRaw: person.deathDateRaw, place: person.deathPlaceFull, icon: '†' });
  }
  if (person.burialDateRaw || person.burialPlace) {
    timeline.push({ label: 'Inhumation', dateRaw: person.burialDateRaw, place: person.burialPlace, icon: '⚰' });
  }

  // Initials for avatar fallback
  const initials = person.displayName.split(' ').filter(Boolean).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() || '?';

  return (
    <div className="h-screen overflow-y-auto bg-slate-50 dark:bg-slate-950">
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
        <div className="relative z-10 flex items-center justify-between px-6 pt-4">
          <Link href="/" className="flex items-center gap-1.5 text-white/75 hover:text-white text-sm transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Accueil
          </Link>
          <div className="flex items-center gap-2">
            <ShareButton personId={id} />
            <Link
              href={`/person/${id}/print`}
              target="_blank"
              className="px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 backdrop-blur-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              PDF
            </Link>
            <Link
              href={`/person/${id}/edit`}
              className="px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 backdrop-blur-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Éditer
            </Link>
            <Link
              href={`/?focus=${id}`}
              className="px-3 py-1.5 bg-white text-slate-800 rounded-lg text-sm font-semibold hover:bg-white/90 transition-colors"
            >
              Voir dans l&apos;arbre
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

          {/* Name + dates */}
          <div style={{ paddingBottom: 4 }}>
            <h1 style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: '2rem', fontWeight: 700, color: 'white', margin: 0, lineHeight: 1.2, textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}>
              {person.displayName}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.75)', margin: '6px 0 0', fontSize: '0.9rem' }}>
              {person.birthYear || '?'}{person.deathYear ? ` – ${person.deathYear}` : ''}
              {person.occupations.length > 0 && <span> · {person.occupations[0]}</span>}
              {person.nationality && <span> · {person.nationality}</span>}
            </p>
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

        {/* Bio narrative */}
        {bio && (
          <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl px-6 py-4 mb-6">
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">{bio}</p>
          </div>
        )}

        {/* Timeline */}
        {timeline.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm mb-6">
            <h2 className="text-lg font-semibold mb-5 text-slate-700 dark:text-slate-300">Chronologie</h2>
            <ol className="relative border-l-2 border-slate-200 dark:border-slate-700 space-y-5 ml-3">
              {timeline.map((item, i) => (
                <li key={i} className="ml-6">
                  <span className="absolute -left-3 flex items-center justify-center w-6 h-6 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 text-xs">
                    {item.icon}
                  </span>
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-200 text-sm">{item.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {item.dateRaw && <span>{item.dateRaw}</span>}
                      {item.dateRaw && item.place && <span> — </span>}
                      {item.place && <span>{item.place}</span>}
                    </p>
                    {item.note && (
                      item.note.length > 250 ? (
                        <details className="mt-1">
                          <summary className="text-xs text-blue-500 cursor-pointer hover:text-blue-400 select-none">Voir la note…</summary>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 whitespace-pre-wrap leading-relaxed">{item.note}</p>
                        </details>
                      ) : (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 whitespace-pre-wrap leading-relaxed">{item.note}</p>
                      )
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Migration / life journey — pass coords as JSON string to bypass RSC number serialization bug */}
        <MigrationSection stops={journeyStops} personId={id} stopsJson={JSON.stringify(journeyStops)} />

        {/* Map — relatives context */}
        {mapMarkers.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm mb-6 mt-6">
            <h2 className="text-lg font-semibold mb-4 text-slate-700 dark:text-slate-300">Carte — famille proche</h2>
            <PersonMapWrapper markers={mapMarkers} centerId={id} />
          </div>
        )}

        {/* Family */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(parents.length > 0 || adoptiveParents.length > 0) && (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4 text-slate-700 dark:text-slate-300">Parents</h2>
              <div className="space-y-2">
                {parents.map(p => <PersonListItem key={p.id} person={p} />)}
                {adoptiveParents.map(p => <PersonListItem key={p.id} person={p} badge="adoptif" />)}
              </div>
            </div>
          )}
          {siblings.length > 0 && <FamilySection title="Fratrie" persons={siblings} />}
          {spouses.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4 text-slate-700 dark:text-slate-300">Conjoints</h2>
              <div className="space-y-4">
                {spouses.map((s) => s.person && (
                  <div key={s.familyId}>
                    <PersonListItem person={s.person} />
                    <div className="ml-5 mt-1 space-y-0.5">
                      {s.marriageDateRaw && (
                        <p className="text-xs text-slate-400">
                          Mariage : {s.marriageDateRaw}{s.marriagePlace && ` — ${s.marriagePlace}`}
                        </p>
                      )}
                      {s.divorceDateRaw && (
                        <p className="text-xs text-slate-400">
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
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4 text-slate-700 dark:text-slate-300">Enfants</h2>
              <div className="space-y-2">
                {children.map(p => <PersonListItem key={p.id} person={p} />)}
                {adoptedChildren.map(p => <PersonListItem key={p.id} person={p} badge="adoptif" />)}
              </div>
            </div>
          )}
        </div>

        {/* Biographical notes */}
        {person.notes && (
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm mt-6">
            <h2 className="text-lg font-semibold mb-4 text-slate-700 dark:text-slate-300">Notes biographiques</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">{person.notes}</p>
          </div>
        )}

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
      </main>
    </div>
  );
}

function FamilySection({ title, persons }: { title: string; persons: PersonRecord[] }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-4 text-slate-700 dark:text-slate-300">{title}</h2>
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
      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
    >
      <span className={`w-2.5 h-2.5 rounded-full ${dot} shrink-0`} />
      <span className="text-sm group-hover:text-blue-600 transition-colors">{person.displayName}</span>
      {badge && <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">{badge}</span>}
      {person.birthYear && <span className="text-xs text-slate-400 ml-auto">{person.birthYear}</span>}
    </Link>
  );
}
