import Link from 'next/link';
import { getAllPersons, getParents } from '@/lib/gedcom-store';

interface Anomaly {
  personId: string;
  name: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export default async function AnomaliesPage() {
  const persons = await getAllPersons();
  const anomalies: Anomaly[] = [];

  for (const p of persons) {
    const birthY = p.birthYear ? parseInt(p.birthYear) : null;
    const deathY = p.deathYear ? parseInt(p.deathYear) : null;

    // Death before birth
    if (birthY && deathY && deathY < birthY) {
      anomalies.push({ personId: p.id, name: p.displayName, severity: 'error', message: `Décès (${deathY}) avant la naissance (${birthY})` });
    }

    // Age > 120
    if (birthY && deathY && (deathY - birthY) > 120) {
      anomalies.push({ personId: p.id, name: p.displayName, severity: 'warning', message: `Âge au décès anormalement élevé : ${deathY - birthY} ans` });
    }

    // Birth in the future
    const currentYear = new Date().getFullYear();
    if (birthY && birthY > currentYear) {
      anomalies.push({ personId: p.id, name: p.displayName, severity: 'error', message: `Naissance dans le futur : ${birthY}` });
    }

    // No birth date at all (info only — not an error)
    if (!p.birthDateRaw && !p.birthYear) {
      anomalies.push({ personId: p.id, name: p.displayName, severity: 'info', message: 'Aucune date de naissance' });
    }

    // Parents younger than child (or too close)
    if (birthY) {
      const parents = await getParents(p.id);
      for (const parent of parents) {
        const parentBirthY = parent.birthYear ? parseInt(parent.birthYear) : null;
        if (parentBirthY) {
          const gap = birthY - parentBirthY;
          if (gap < 0) {
            anomalies.push({ personId: p.id, name: p.displayName, severity: 'error', message: `Né(e) avant son parent ${parent.displayName} (${parentBirthY})` });
          } else if (gap < 12) {
            anomalies.push({ personId: p.id, name: p.displayName, severity: 'warning', message: `Seulement ${gap} an${gap > 1 ? 's' : ''} de différence avec le parent ${parent.displayName}` });
          } else if (gap > 80) {
            anomalies.push({ personId: p.id, name: p.displayName, severity: 'warning', message: `Parent ${parent.displayName} avait ${gap} ans à la naissance (peu probable)` });
          }
        }
      }
    }
  }

  // Sort: errors first, then warnings, then info
  const order = { error: 0, warning: 1, info: 2 };
  anomalies.sort((a, b) => order[a.severity] - order[b.severity] || a.name.localeCompare(b.name));

  const errors = anomalies.filter(a => a.severity === 'error');
  const warnings = anomalies.filter(a => a.severity === 'warning');
  const infos = anomalies.filter(a => a.severity === 'info');

  const colors = {
    error: 'bg-red-50 dark:bg-red-900/10 border-l-4 border-red-400',
    warning: 'bg-yellow-50 dark:bg-yellow-900/10 border-l-4 border-yellow-400',
    info: 'bg-slate-50 dark:bg-slate-800 border-l-4 border-slate-300',
  };
  const badges = {
    error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    info: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
  };

  return (
    <div className="h-screen overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link href="/" className="text-sm text-primary hover:underline flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Arbre
          </Link>
          <h1 className="text-lg font-bold text-slate-800 dark:text-slate-200">Rapport d&apos;anomalies</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Erreurs', count: errors.length, cls: 'text-red-600' },
            { label: 'Avertissements', count: warnings.length, cls: 'text-yellow-600' },
            { label: 'Informations', count: infos.length, cls: 'text-slate-500' },
          ].map(({ label, count, cls }) => (
            <div key={label} className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm text-center">
              <p className={`text-3xl font-bold ${cls}`}>{count}</p>
              <p className="text-sm text-slate-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {anomalies.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl p-12 shadow-sm text-center text-slate-400">
            Aucune anomalie détectée.
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {anomalies.map((a, i) => (
                <div key={i} className={`flex items-start gap-3 px-4 py-3 ${colors[a.severity]}`}>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${badges[a.severity]}`}>
                    {a.severity === 'error' ? 'Erreur' : a.severity === 'warning' ? 'Attention' : 'Info'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <Link href={`/person/${a.personId}`} className="text-sm font-medium hover:text-primary transition-colors">
                      {a.name}
                    </Link>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{a.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
