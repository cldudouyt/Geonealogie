import { runQuery } from '@/lib/neo4j';
import Link from 'next/link';

interface FeedbackRow {
  id: string;
  name: string;
  title: string;
  description: string;
  createdAt: string;
  status: string;
}

async function getFeedbacks(): Promise<FeedbackRow[]> {
  return runQuery<FeedbackRow>(
    `MATCH (f:Feedback)
     RETURN f.id AS id, f.name AS name, f.title AS title,
            f.description AS description, toString(f.createdAt) AS createdAt, f.status AS status
     ORDER BY f.createdAt DESC`,
  );
}

export default async function AdminFeedbackPage() {
  const feedbacks = await getFeedbacks();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Retour
          </Link>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Suggestions reçues ({feedbacks.length})
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-4">
        {feedbacks.length === 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center">
            <p className="text-slate-500">Aucune suggestion reçue pour l&apos;instant.</p>
          </div>
        )}

        {feedbacks.map(f => (
          <div key={f.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-slate-800 dark:text-slate-100">{f.title}</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Par <span className="text-slate-500">{f.name}</span>
                  {' · '}
                  {new Date(f.createdAt).toLocaleDateString('fr-FR', {
                    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-3 whitespace-pre-wrap">{f.description}</p>
              </div>
              <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                {f.status}
              </span>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
