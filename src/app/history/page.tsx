import { requireRole } from '@/lib/session';
import { loadOverrides } from '@/lib/overrides-store';
import Link from 'next/link';
import RestoreButton from './RestoreButton';
export default async function HistoryPage() {
  await requireRole('admin');
  const state = await loadOverrides();
  const entries = [...(state.history ?? [])].reverse();
  return <main className="content-page"><p className="eyebrow">Mémoire des contributions</p><h1>Historique et restauration</h1><p>Chaque changement de fiche, source ou fusion est conservé. La dernière opération peut être annulée sans écraser de contribution ultérieure.</p>{entries[0]?.label.startsWith('Restauration') && <p role="status">Restauration effectuée.</p>}<a className="secondary-action" href="/api/export/backup">Télécharger une sauvegarde complète</a>{!entries.length && <p className="empty-state">Les prochaines modifications apparaîtront ici.</p>}
    <ol className="history-list">{entries.map((entry, i) => <li className="source-item" key={entry.id}><h2>{entry.label}</h2><p>{entry.actor} · {new Date(entry.at).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}</p><div className="action-row">{entry.personIds.map(id => <Link key={id} href={`/person/${id}`}>Fiche {id}</Link>)}</div><details><summary>Voir les valeurs avant modification</summary><pre className="history-preview">{JSON.stringify(Object.fromEntries(entry.personIds.map(id => [id, entry.before.newPersons.find(p => p.id === id) ?? entry.before.persons[id] ?? 'Données GEDCOM d’origine'])), null, 2)}</pre></details>{i === 0 && <RestoreButton id={entry.id} />}</li>)}</ol>
  </main>;
}
