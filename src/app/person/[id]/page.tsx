import Link from 'next/link';
import ShareButton from '@/components/ui/ShareButton';
import { getPerson, getParents, getChildren, getSpouses, getSiblings } from '@/lib/gedcom-store';
import type { PersonRecord } from '@/lib/gedcom-store';
import type { MapMarker } from '@/components/map/PersonMap';
import PersonMapWrapper from '@/components/map/PersonMapWrapper';
import { Avatar } from '@/components/ui/Avatar';
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

  const borderColor = person.sex === 'M' ? 'border-male' : person.sex === 'F' ? 'border-female' : 'border-neutral';

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

  return (
    <div className="h-screen overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
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
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              PDF
            </Link>
            <Link
              href={`/person/${id}/edit`}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Éditer
            </Link>
            <Link
              href={`/?focus=${id}`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors"
            >
              Voir dans l&apos;arbre
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {/* Identity card */}
        <div className={`bg-white dark:bg-slate-900 rounded-xl border-l-4 ${borderColor} p-8 shadow-sm mb-6`}>
          <div className="flex items-center gap-4 mb-2">
            <Avatar name={person.displayName} sex={person.sex} photoUrl={person.photoUrl} size="xl" />
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{person.displayName}</h1>
          </div>
          {person.nickname && (
            <p className="text-slate-500 dark:text-slate-400 mt-1 italic">&ldquo;{person.nickname}&rdquo;</p>
          )}
          <div className="mt-4 space-y-1 text-slate-600 dark:text-slate-400 text-sm">
            {person.occupations.length > 0 && (
              <p><span className="font-medium text-slate-700 dark:text-slate-300">Profession :</span> {person.occupations.join(', ')}</p>
            )}
            {person.nationality && (
              <p><span className="font-medium text-slate-700 dark:text-slate-300">Nationalité :</span> {person.nationality}</p>
            )}
            {person.isAdopted && (
              <p className="text-amber-600 dark:text-amber-400 font-medium">Adopté(e)</p>
            )}
          </div>
        </div>

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

        {/* Map */}
        {mapMarkers.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm mb-6">
            <h2 className="text-lg font-semibold mb-4 text-slate-700 dark:text-slate-300">Carte des naissances et décès</h2>
            <PersonMapWrapper markers={mapMarkers} centerId={id} />
          </div>
        )}

        {/* Family */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {parents.length > 0 && <FamilySection title="Parents" persons={parents} />}
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
          {children.length > 0 && <FamilySection title="Enfants" persons={children} />}
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

function PersonListItem({ person }: { person: PersonRecord }) {
  const dot = person.sex === 'M' ? 'bg-male' : person.sex === 'F' ? 'bg-female' : 'bg-neutral';
  return (
    <Link
      href={`/person/${person.id}`}
      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
    >
      <span className={`w-2.5 h-2.5 rounded-full ${dot} shrink-0`} />
      <span className="text-sm group-hover:text-blue-600 transition-colors">{person.displayName}</span>
      {person.birthYear && <span className="text-xs text-slate-400 ml-auto">{person.birthYear}</span>}
    </Link>
  );
}
