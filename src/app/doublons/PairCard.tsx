'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { mergePersonsAction, ignoreDoublonAction, previewMerge } from './actions';
import { MERGE_FIELDS, type MergeField } from '@/lib/merge-fields';
import { Button } from '@/components/ui/Button';

interface Person {
  id: string;
  displayName: string;
  birthYear?: string;
  deathYear?: string;
  birthPlace?: string;
}

interface PairCardProps {
  a: Person;
  b: Person;
  confidence: 'certain' | 'probable' | 'possible';
  reasons: string[];
}

const CONF_STYLE: Record<PairCardProps['confidence'], { headBg: string; confCol: string; label: string }> = {
  certain:  { headBg: '#fae6e3', confCol: '#b03a2e', label: 'CERTAIN' },
  probable: { headBg: '#f8eecf', confCol: '#8a6d12', label: 'PROBABLE' },
  possible: { headBg: '#e9eff5', confCol: '#3f617f', label: 'POSSIBLE' },
};

export default function PairCard({ a, b, confidence, reasons }: PairCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [pickMerge, setPickMerge] = useState(false);
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewMerge>> | null>(null);
  const [choices, setChoices] = useState<Partial<Record<MergeField, 'keep' | 'other'>>>({});
  const [error, setError] = useState('');
  const [merged, setMerged] = useState(false);
  const openPreview = () => startTransition(async () => { try { setPreview(await previewMerge(a.id, b.id)); setPickMerge(true); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'Comparaison indisponible.'); } });

  const { headBg, confCol, label } = CONF_STYLE[confidence];

  if (done) return merged ? <div className="source-item" role="status">Fusion enregistrée. <Link href="/history">Consulter l’historique ou annuler</Link></div> : null;

  const handleMerge = (keepId: string, deleteId: string) => {
    startTransition(async () => {
      try { await mergePersonsAction(keepId, deleteId, choices, preview?.revision); setMerged(true); setDone(true); router.push('/doublons?merged=1'); }
      catch (e) { setError(e instanceof Error ? e.message : 'La fusion a échoué.'); }
    });
  };

  const handleIgnore = () => {
    startTransition(async () => {
      try { await ignoreDoublonAction(a.id, b.id); setDone(true); } catch { setError('La modification n’a pas été enregistrée.'); }
    });
  };

  const persons: Person[] = [a, b];

  return (
    <div data-pair={[a.id, b.id].sort().join(':')}
      style={{
        border: '1px solid #e7e0d0',
        borderRadius: 16,
        overflow: 'hidden',
        opacity: isPending ? 0.5 : 1,
        pointerEvents: isPending ? 'none' : undefined,
        transition: 'opacity .2s',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '10px 18px',
          background: headBg,
          borderBottom: '1px solid #ece5d5',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span style={{ color: confCol, textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 11, fontWeight: 700 }}>
          {label}
        </span>
        <span style={{ fontSize: 12, color: '#8a8474', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {reasons.join(' · ')}
        </span>
      </div>

      {/* Body — 2-col */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#fffdf9' }}>
        {persons.map((person, idx) => {
          const yearRange = person.birthYear && person.deathYear
            ? `${person.birthYear} – ${person.deathYear}`
            : person.birthYear ?? null;
          const meta = [yearRange, person.birthPlace].filter(Boolean).join(' · ');
          return (
            <div key={person.id} style={{ padding: '16px 18px', borderRight: idx === 0 ? '1px solid #e9e2d2' : undefined }}>
              <Link href={`/person/${person.id}`} style={{ fontSize: 14, fontWeight: 700, color: '#1c1f1c', textDecoration: 'none' }}>
                {person.displayName}
              </Link>
              {meta && <p style={{ fontSize: 12, color: '#8a8474', margin: '4px 0 0' }}>{meta}</p>}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 18px', borderTop: '1px solid #f1ebdd', background: '#fffdf9' }}>
        {error && <p role="alert" className="error-message">{error}</p>}
        {pickMerge && preview ? <div>
          <h3>Comparer et préparer la fusion</h3><p>La fiche de gauche sera conservée. Choisissez chaque valeur à garder ; les événements, sources et documents seront réunis.</p>
          <div className="comparison-scroll"><table className="comparison-table"><thead><tr><th>Information</th><th>{a.displayName}</th><th>{b.displayName}</th><th>Résultat</th></tr></thead><tbody>
            {(Object.keys(MERGE_FIELDS) as MergeField[]).filter(key => preview.a[key] != null || preview.b[key] != null).map(key => <tr key={key}><th scope="row">{MERGE_FIELDS[key]}</th><td>{String(preview.a[key] ?? '—')}</td><td>{String(preview.b[key] ?? '—')}</td><td><select aria-label={`Valeur conservée : ${MERGE_FIELDS[key]}`} value={choices[key] ?? (preview.a[key] == null ? 'other' : 'keep')} onChange={e => setChoices(c => ({ ...c, [key]: e.target.value as 'keep' | 'other' }))}><option value="keep">Gauche</option><option value="other">Droite</option></select></td></tr>)}
          </tbody></table></div><p>Les notes différentes sont réunies si aucun choix explicite n’est fait pour ce champ. L’opération pourra être annulée dans l’historique.</p>
          <div className="action-row"><Button disabled={isPending} onClick={() => handleMerge(a.id, b.id)}>Confirmer la fusion</Button><Button variant="secondary" onClick={() => setPickMerge(false)}>Annuler</Button></div>
        </div> : <div className="action-row"><Button variant="primary" onClick={openPreview}>Comparer avant de fusionner</Button><Button variant="secondary" onClick={handleIgnore}>Ignorer</Button></div>}

      </div>
    </div>
  );
}
