import { getPerson } from '@/lib/gedcom-store';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import EditForm from './EditForm';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditPersonPage({ params }: Props) {
  const { id } = await params;
  const person = getPerson(id);
  if (!person) return notFound();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/person/${id}`} className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Retour
            </Link>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Éditer — {person.displayName}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-6">
          <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-2.5">
            Les modifications sont stockées localement et s&apos;appliquent par-dessus les données GEDCOM d&apos;origine. Les champs laissés vides conserveront leur valeur actuelle.
          </p>
        </div>

        <EditForm person={person} />
      </main>
    </div>
  );
}
