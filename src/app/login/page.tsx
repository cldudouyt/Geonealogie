'use client';

import { useActionState } from 'react';
import { login } from './actions';

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md p-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <svg className="w-10 h-10 text-blue-600 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3v18M12 3c-3 0-6 3-6 6s3 3 6 3M12 3c3 0 6 3 6 6s-3 3-6 3M12 12c-3 0-6 3-6 6M12 12c3 0 6 3 6 6" />
          </svg>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Geonealogie</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Accès privé — famille uniquement</p>
        </div>

        <form action={action} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              name="password"
              required
              autoFocus
              autoComplete="current-password"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          {state?.error && (
            <p className="text-sm text-red-500 dark:text-red-400">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-colors disabled:opacity-60"
          >
            {pending ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
