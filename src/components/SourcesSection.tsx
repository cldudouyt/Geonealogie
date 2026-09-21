'use client';
import { useActionState } from 'react';
import type { SourceEvidence } from '@/lib/overrides-store';
import type { DocumentMeta } from '@/lib/documents-store';
import { addSource } from '@/app/person/[id]/sources/actions';
import { useSession } from './SessionContext';
const labels = { confirmed: 'Confirmée', approximate: 'Approximative', unverified: 'À vérifier' };
export default function SourcesSection({ id, sources, documents, events }: { id: string; sources: SourceEvidence[]; documents: DocumentMeta[]; events: string[] }) {
  const { canEdit } = useSession();
  const [state, action, pending] = useActionState(addSource.bind(null, id), null);
  return <section className="source-section"><h2>Preuves et références</h2><p>Reliez un événement à un acte, une archive ou un témoignage. La certitude est indiquée par le contributeur.</p>
    {!sources.length && <p className="empty-state">Aucune source liée pour le moment. Les informations de la fiche restent à documenter.</p>}
    {sources.map(source => { const doc = documents.find(d => d.id === source.documentId); return <article className="source-item" key={source.id}><h3>{source.event}</h3><span className={`certainty certainty-${source.confidence}`}>{labels[source.confidence]}</span><p>{source.reference}</p>{source.url && <a href={source.url} target="_blank" rel="noopener noreferrer">Consulter la référence ↗</a>}{doc && <a className="secondary-action" href={`/api/persons/${id}/documents/${doc.id}/file`} target="_blank" rel="noopener noreferrer">{doc.title || doc.originalName}</a>}</article>; })}
    {canEdit && <details className="source-form"><summary>Ajouter une source</summary><form action={action} className="form-stack">
      <label>Événement concerné<input name="event" list="source-events" required maxLength={200} placeholder="Ex. Naissance · 12 mars 1890" /></label><datalist id="source-events">{events.map(e => <option key={e} value={e} />)}</datalist>
      <label>Référence ou témoignage<textarea name="reference" required maxLength={2000} placeholder="Archives, cote, page, auteur du témoignage…" /></label>
      <label>Lien vers l’archive (facultatif)<input name="url" type="url" placeholder="https://…" /></label>
      <label>Document de cette fiche<select name="documentId"><option value="">Aucun document lié</option>{documents.map(d => <option key={d.id} value={d.id}>{d.title || d.originalName}</option>)}</select></label>
      <label>Certitude<select aria-label="Certitude" name="confidence" defaultValue="unverified"><option value="unverified">À vérifier</option><option value="approximate">Approximative</option><option value="confirmed">Confirmée</option></select></label>
      {state?.error && <p role="alert">{state.error}</p>}{state?.success && <p role="status">Source enregistrée.</p>}<button disabled={pending} className="primary-action">{pending ? 'Enregistrement…' : 'Enregistrer la source'}</button>
    </form></details>}
  </section>;
}
