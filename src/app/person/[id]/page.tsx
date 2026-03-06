import Link from 'next/link';
import { getPerson, getParents, getChildren, getSpouses, getSiblings } from '@/lib/gedcom-store';
import type { PersonRecord, LifeEvent } from '@/lib/gedcom-store';

interface PersonPageProps {
  params: Promise<{ id: string }>;
}

export default async function PersonPage({ params }: PersonPageProps) {
  const { id } = await params;

  const person = getPerson(id);
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

  const parents = getParents(id);
  const children = getChildren(id);
  const spouses = getSpouses(id);
  const siblings = getSiblings(id);

  const borderColor = person.sex === 'M' ? 'border-blue-500' : person.sex === 'F' ? 'border-pink-500' : 'border-gray-400';

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Retour à l&apos;arbre
          </Link>
          <Link
            href={`/?focus=${id}`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors"
          >
            Voir dans l&apos;arbre
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {/* Identity card */}
        <div className={`bg-white dark:bg-slate-900 rounded-xl border-l-4 ${borderColor} p-8 shadow-sm mb-6`}>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{person.displayName}</h1>
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
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 whitespace-pre-wrap leading-relaxed">{item.note}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
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
  const dot = person.sex === 'M' ? 'bg-blue-500' : person.sex === 'F' ? 'bg-pink-500' : 'bg-gray-400';
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
