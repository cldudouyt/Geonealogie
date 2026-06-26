'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { mergePersonsAction, ignoreDoublonAction } from './actions';
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
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [pickMerge, setPickMerge] = useState(false);

  const { headBg, confCol, label } = CONF_STYLE[confidence];

  if (done) return null;

  const handleMerge = (keepId: string, deleteId: string) => {
    startTransition(async () => {
      await mergePersonsAction(keepId, deleteId);
      setDone(true);
    });
  };

  const handleIgnore = () => {
    startTransition(async () => {
      await ignoreDoublonAction(a.id, b.id);
      setDone(true);
    });
  };

  const persons: Person[] = [a, b];

  return (
    <div
      style={{
        border: '1px solid #e9e2d2',
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
        {pickMerge ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12.5, color: '#6c7064', marginRight: 4 }}>Garder&nbsp;:</span>
            {persons.map(p => (
              <Button
                key={p.id}
                size="sm"
                variant="primary"
                onClick={() => handleMerge(p.id, p.id === a.id ? b.id : a.id)}
              >
                {p.displayName}
              </Button>
            ))}
            <Button size="sm" variant="ghost" onClick={() => setPickMerge(false)}>Annuler</Button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="primary" onClick={() => setPickMerge(true)}>Fusionner</Button>
            <Button variant="secondary" onClick={handleIgnore}>Ignorer</Button>
          </div>
        )}
      </div>
    </div>
  );
}
