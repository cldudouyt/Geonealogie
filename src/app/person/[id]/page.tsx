import Link from 'next/link';
import { getPerson, getParents, getChildren, getSpouses, getSiblings } from '@/lib/gedcom-store';
import type { PersonRecord } from '@/lib/gedcom-store';

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
        <div className={`bg-white dark:bg-slate-900 rounded-xl border-l-4 ${borderColor} p-8 shadow-sm mb-6`}>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{person.displayName}</h1>
          <div className="mt-3 space-y-1 text-slate-600 dark:text-slate-400">
            {person.birthDateRaw && (
              <p><span className="font-medium">Naissance :</span> {person.birthDateRaw}{person.birthPlaceFull && ` — ${person.birthPlaceFull}`}</p>
            )}
            {person.deathDateRaw && (
              <p><span className="font-medium">Décès :</span> {person.deathDateRaw}{person.deathPlaceFull && ` — ${person.deathPlaceFull}`}</p>
            )}
            {person.occupation && (
              <p><span className="font-medium">Profession :</span> {person.occupation}</p>
            )}
            {person.nationality && (
              <p><span className="font-medium">Nationalité :</span> {person.nationality}</p>
            )}
            {person.isAdopted && <p className="text-amber-600 font-medium">Adopté(e)</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {parents.length > 0 && <FamilySection title="Parents" persons={parents} />}
          {siblings.length > 0 && <FamilySection title="Fratrie" persons={siblings} />}
          {spouses.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4 text-slate-700 dark:text-slate-300">Conjoints</h2>
              <div className="space-y-3">
                {spouses.map((s) => s.person && (
                  <div key={s.familyId}>
                    <PersonListItem person={s.person} />
                    {s.marriageDateRaw && (
                      <p className="text-xs text-slate-400 ml-5 mt-0.5">
                        Mariage : {s.marriageDateRaw}{s.marriagePlace && ` — ${s.marriagePlace}`}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {children.length > 0 && <FamilySection title="Enfants" persons={children} />}
        </div>

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
