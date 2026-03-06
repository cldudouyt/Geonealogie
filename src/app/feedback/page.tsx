'use client';

import { useActionState } from 'react';
import { submitFeedback, type FeedbackState } from './actions';
import Link from 'next/link';

export default function FeedbackPage() {
  const [state, action, pending] = useActionState<FeedbackState | null, FormData>(
    submitFeedback,
    null,
  );

  if (state?.success) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-10 max-w-md w-full text-center shadow-sm">
          <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Suggestion envoyée !</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Merci pour votre contribution. Votre demande a été transmise et sera étudiée.
          </p>
          <Link
            href="/"
            className="inline-block px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 max-w-lg w-full shadow-sm">
        {/* Header */}
        <div className="mb-7">
          <Link href="/" className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors mb-4 inline-block">
            ← Retour
          </Link>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Suggérer une amélioration</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Une idée, une erreur à corriger, une fonctionnalité manquante ? Faites-le nous savoir.
          </p>
        </div>

        <form action={action} className="space-y-5">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Votre prénom <span className="text-slate-400 font-normal">(optionnel)</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="given-name"
              placeholder="Marie"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Titre de la suggestion <span className="text-red-400">*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              placeholder="Ex : Ajouter un export PDF de la fiche"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              required
              rows={5}
              placeholder="Décrivez votre idée ou le problème rencontré en détail..."
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
            />
          </div>

          {/* Error */}
          {state?.error && (
            <p className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
              {state.error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={pending}
            className="w-full py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {pending ? 'Envoi en cours…' : 'Envoyer la suggestion'}
          </button>
        </form>
      </div>
    </div>
  );
}
