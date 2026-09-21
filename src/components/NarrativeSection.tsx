'use client';

import { useState } from 'react';
import { useSession } from './SessionContext';

export interface NarrativeInitial {
  text: string;
  generatedAt: string;
}

export default function NarrativeSection({
  personId,
  initial,
}: {
  personId: string;
  initial: NarrativeInitial | null;
}) {
  const { canEdit } = useSession();
  const [narrative, setNarrative] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!narrative && !canEdit) return null;

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/persons/${personId}/narrative`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur lors de la génération');
        return;
      }
      setNarrative({ text: data.text, generatedAt: data.generatedAt });
    } catch {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#f1f4ef] border border-[#dde5da] rounded-2xl px-6 py-5 mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-[#1c1f1c] uppercase tracking-wide" style={{ fontSize: '0.75rem', letterSpacing: '.08em' }}>
          Portrait
        </h2>
        {canEdit && (
          <button
            onClick={generate}
            disabled={loading}
            className="text-xs font-medium text-[#2f5142] hover:underline disabled:opacity-50"
          >
            {loading ? 'Génération…' : narrative ? 'Régénérer' : 'Générer un portrait IA'}
          </button>
        )}
      </div>

      {narrative ? (
        <>
          <p
            className="text-sm text-[#3f4a41] leading-relaxed whitespace-pre-wrap"
            style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: '0.95rem' }}
          >
            {narrative.text}
          </p>
          <p className="text-xs text-[#9aa89b] mt-3">
            Portrait généré par IA à partir des données de la fiche, le {new Date(narrative.generatedAt).toLocaleDateString('fr-FR')}.
            {' '}Signalez toute erreur via « Suggérer une correction ».
          </p>
        </>
      ) : (
        <p className="text-sm text-[#8a8474]">Aucun portrait généré pour le moment.</p>
      )}

      {error && <p className="text-xs text-[#b91c1c] mt-2">{error}</p>}
    </div>
  );
}
