import { getPerson } from '@/lib/gedcom-store';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { loadOverrides } from '@/lib/overrides-store';
import { requireRole } from '@/lib/session';
import EditForm from './EditForm';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditPersonPage({ params }: Props) {
  await requireRole('contributor');
  const overrides = await loadOverrides();
  const { id } = await params;
  const person = await getPerson(id);
  if (!person) return notFound();

  return (
    <div className="min-h-screen bg-[#f4f1ea]">
      <header className="bg-[#fffdf9] border-b border-[#e7e0d0] px-6 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/person/${id}`} className="text-sm text-[#8a8474] hover:text-[#2f5142] flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Retour
            </Link>
            <span className="text-[#e0d8c6]">/</span>
            <h1 className="text-sm font-semibold text-[#1c1f1c]" style={{ fontFamily: 'var(--font-serif, Georgia, serif)' }}>
              Éditer — {person.displayName}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-6">
          <p className="text-sm text-[#b5651d] bg-[#f7e6d6] border border-[#eed9bd] rounded-lg px-4 py-2.5">
            Vos modifications sont enregistrées avec un historique. Les champs laissés vides conserveront leur valeur actuelle.
          </p>
        </div>

        <EditForm person={person} version={overrides.personVersions?.[id] ?? 0} />
      </main>
    </div>
  );
}
