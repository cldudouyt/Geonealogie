'use client';
import { useState } from 'react';
import { useSession } from './SessionContext';
import type { NarrativeEntry } from '@/lib/narratives-store';
export default function NarrativeSection({ personId, initial, fingerprint }: { personId: string; initial: NarrativeEntry | null; fingerprint: string }) {
  const { canEdit } = useSession();
  const [entry, setEntry] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initial?.text ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  if (!entry && !canEdit) return null;
  const stale = Boolean(entry && entry.fingerprint !== fingerprint);
  async function save(method: 'POST' | 'PATCH') {
    setBusy(true); setMessage('');
    try {
      const res = await fetch(`/api/persons/${personId}/narrative`, { method, headers: { 'Content-Type': 'application/json' }, body: method === 'PATCH' ? JSON.stringify({ text: draft, revision: entry?.revision ?? 0, fingerprint }) : undefined });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Enregistrement impossible.');
      setEntry(data); setDraft(data.text); setEditing(false); setMessage('Portrait enregistré.');
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }
  return <section className="journey-card" aria-labelledby="portrait-heading">
    <h2 id="portrait-heading">Portrait</h2>
    {stale && <p role="status">À revoir : la fiche a changé depuis ce portrait, ou ses faits de référence sont inconnus.</p>}
    {editing ? <label>Texte du portrait<textarea className="portrait-editor" value={draft} onChange={e => setDraft(e.target.value)} maxLength={10000} rows={8} /></label> : <p className="whitespace-pre-wrap">{entry?.text || 'Vous pouvez rédiger un portrait ou en générer un à partir des faits renseignés.'}</p>}
    {entry && <p className="helper-text">{entry.reviewedAt ? `Relu et validé par ${entry.reviewedBy}` : 'Texte généré par IA, à relire'} · {new Date(entry.reviewedAt || entry.generatedAt).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })}</p>}
    {entry?.facts !== undefined && <details><summary>Faits utilisés pour ce portrait</summary><dl>{Object.entries(entry.facts as Record<string, unknown>).map(([key, value]) => <div key={key}><dt className="font-semibold">{{ displayName: 'Personne', birth: 'Naissance', death: 'Décès', occupations: 'Professions' }[key] || key}</dt><dd>{Array.isArray(value) ? value.join(', ') || 'Non renseigné' : value && typeof value === 'object' ? Object.values(value).filter(Boolean).join(' · ') || 'Non renseigné' : String(value ?? 'Non renseigné')}</dd></div>)}</dl><p>Les faits de la fiche ne constituent pas à eux seuls une preuve. Consultez l’onglet Sources.</p></details>}
    {canEdit && <div className="action-row">
      {editing ? <><button className="primary-action" disabled={busy || !draft.trim()} onClick={() => save('PATCH')}>Enregistrer et valider</button><button className="secondary-action" disabled={busy} onClick={() => setEditing(false)}>Annuler</button></> : <><button className="secondary-action" disabled={busy} onClick={() => setEditing(true)}>{entry ? 'Corriger / valider' : 'Rédiger le portrait'}</button><button className="secondary-action" disabled={busy} onClick={() => save('POST')}>{busy ? 'Génération…' : entry ? 'Régénérer avec l’IA' : 'Générer avec l’IA'}</button></>}
    </div>}
    <p role="status" aria-live="polite">{message}</p>
  </section>;
}
