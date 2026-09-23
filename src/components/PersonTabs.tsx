'use client';
import { useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
const labels = ['Vie', 'Famille', 'Lieux', 'Docs'];
export default function PersonTabs({ panels }: { panels: ReactNode[] }) {
  const params = useSearchParams();
  const [active, setActive] = useState(params.get('tab') === 'sources' ? 3 : 0);
  return <><div role="tablist" aria-label="Informations de la personne" className="person-tabs">{labels.map((label, i) => <button key={label} id={`tab-${i}`} role="tab" aria-selected={active === i} aria-controls={`panel-${i}`} tabIndex={active === i ? 0 : -1} onClick={() => setActive(i)} onKeyDown={e => { if (['ArrowRight','ArrowLeft','Home','End'].includes(e.key)) { e.preventDefault(); const n = e.key === 'Home' ? 0 : e.key === 'End' ? 3 : (i + (e.key === 'ArrowRight' ? 1 : 3)) % 4; setActive(n); document.getElementById(`tab-${n}`)?.focus(); } }}>{label}</button>)}</div>{panels.map((panel, i) => <section key={i} id={`panel-${i}`} role="tabpanel" aria-labelledby={`tab-${i}`} hidden={active !== i} tabIndex={0}>{active === i && panel}</section>)}</>;
}
