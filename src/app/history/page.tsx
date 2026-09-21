import { requireRole } from '@/lib/session';
import { loadOverrides } from '@/lib/overrides-store';
import Link from 'next/link';
import RestoreButton from './RestoreButton';
import RestorePersonButton from './RestorePersonButton';
import BackupTools from './BackupTools';
import { getAllPersons } from '@/lib/gedcom-store';
export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ person?: string }> }) {
  await requireRole('admin');
  const state = await loadOverrides();
  const filter = (await searchParams).person || '';
  const people = await getAllPersons();
  const entries = [...(state.history ?? [])].reverse().filter(e => !filter || e.personIds.includes(filter));
  return <main className="content-page"><p className="eyebrow">Mémoire des contributions</p><h1>Historique et restauration</h1><p>Chaque changement de fiche, source ou fusion est conservé. La dernière opération peut être annulée sans écraser de contribution ultérieure.</p>{entries[0]?.label.startsWith('Restauration') && <p role="status">Restauration effectuée.</p>}<Link href="/admin">Administration et version du site</Link><BackupTools /><form action="/history" className="action-row"><label>Personne <select name="person" defaultValue={filter}><option value="">Toutes les personnes</option>{Array.from(new Set((state.history ?? []).flatMap(e => e.personIds))).map(id => <option key={id} value={id}>{people.find(p => p.id === id)?.displayName || id}</option>)}</select></label><button className="secondary-action">Filtrer</button></form>{!entries.length && <p className="empty-state">Les prochaines modifications apparaîtront ici.</p>}
    <ol className="history-list">{entries.map(entry => <li className="source-item" key={entry.id}><h2>{entry.label}</h2><p>{entry.actor} · {new Date(entry.at).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}</p><div className="action-row">{entry.personIds.map(id => <Link key={id} href={`/person/${id}`}>Fiche {id}</Link>)}</div><details><summary>Voir les valeurs avant modification</summary><pre className="history-preview">{JSON.stringify(Object.fromEntries(entry.personIds.map(id => [id, entry.before.newPersons.find(p => p.id === id) ?? entry.before.persons[id] ?? 'Données GEDCOM d’origine'])), null, 2)}</pre></details>{!entry.label.includes('Fusion') && !entry.label.includes('Ajout') && entry.personIds.map(id => <RestorePersonButton key={id} entryId={entry.id} personId={id} revision={state.revision ?? 0} />)}{entry.id === state.history?.at(-1)?.id && <RestoreButton id={entry.id} />}</li>)}</ol>
  </main>;
}
