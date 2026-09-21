'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { analyzeDuplicatesAction, mergeDuplicatesBatchAction } from './actions';
import { pairKey } from '@/lib/duplicate-analysis';
import { Button } from '@/components/ui/Button';

export default function BatchMerge() {
  const [analysis, setAnalysis] = useState<Awaited<ReturnType<typeof analyzeDuplicatesAction>> | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');
  const [count, setCount] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const candidates = analysis?.pairs.filter(p=>p.eligible) ?? [];
  function analyze() {
    start(async () => {
      setError(''); setConfirm(false); setCount(null); setAnalysis(null); setSelected([]);
      try { setAnalysis(await analyzeDuplicatesAction()); }
      catch(e) { setError(e instanceof Error ? e.message : 'Analyse indisponible.'); }
    });
  }
  function merge() {
    if (!analysis) return;
    start(async () => {
      setError('');
      try { const result = await mergeDuplicatesBatchAction(selected, analysis.revision); setCount(result.count); setAnalysis(null); setSelected([]); setConfirm(false); }
      catch(e) { setError(e instanceof Error ? e.message : 'La fusion n’a pas été enregistrée.'); setConfirm(false); }
    });
  }
  return <section className="source-item" aria-labelledby="batch-title" aria-busy={pending}>
    <h2 id="batch-title">Fusion assistée en lot</h2>
    <p>Les cas de forte concordance exigent les mêmes prénoms complets, une naissance précise au même lieu, deux parents communs et aucune contradiction connue. Vérifiez les fiches : ces critères ne constituent pas une preuve d’identité.</p>
    <p>Les notes, événements, sources et documents sont réunis. Le lot entier est annulable dans l’historique tant qu’aucune autre modification n’a été enregistrée.</p>
    <Button onClick={analyze} disabled={pending}>{pending ? 'Traitement en cours…' : 'Analyser les doublons'}</Button>
    {error && <p role="alert" className="error-message">{error}</p>}
    {count !== null && <p role="status">{count} paire(s) fusionnée(s). <Link href="/history">Consulter l’historique ou annuler le lot</Link></p>}
    {analysis && <div>
      <p role="status">{candidates.length} paire(s) admissible(s). {analysis.pairs.length - candidates.length} paire(s) à examiner individuellement.</p>
      {candidates.length > 0 && <>
        <p>Sélectionnez jusqu’à 50 paires. La première fiche de chaque paire sera conservée.</p>
        <fieldset disabled={pending || confirm}><legend>Paires à fusionner</legend>
          {candidates.map(p=> { const key=pairKey(p.a.id,p.b.id); return <div key={key} className="source-item">
            <label><input type="checkbox" checked={selected.includes(key)} disabled={!selected.includes(key) && selected.length >= 50} onChange={e=>setSelected(ids=>e.target.checked ? [...ids,key] : ids.filter(id=>id!==key))} /> {p.a.displayName} — {p.a.birthDateRaw}, {p.a.birthPlaceFull || p.a.birthPlace}</label>
            <p><Link href={`/person/${p.a.id}`} target="_blank" rel="noreferrer">Fiche conservée ({p.a.id})</Link> · <Link href={`/person/${p.b.id}`} target="_blank" rel="noreferrer">Fiche réunie ({p.b.id})</Link></p>
            <p>{p.reasons.join(' · ')}</p>
          </div>; })}
        </fieldset>
        {confirm ? <div role="group" aria-label="Confirmer le lot"><p>Fusionner les {selected.length} paires sélectionnées ? Toutes les fusions seront enregistrées ensemble.</p><div className="action-row"><Button onClick={merge} disabled={pending}>Confirmer les {selected.length} fusions</Button><Button variant="secondary" disabled={pending} onClick={()=>setConfirm(false)}>Revenir à la sélection</Button></div></div> : <Button disabled={pending || !selected.length} onClick={()=>setConfirm(true)}>Vérifier la sélection ({selected.length})</Button>}
      </>}
    </div>}
  </section>;
}
