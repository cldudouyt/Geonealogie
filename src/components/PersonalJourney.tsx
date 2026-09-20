'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
type Reference = { id: string; name: string };
function subscribe(callback: () => void) { window.addEventListener('storage', callback); window.addEventListener('geo-preference', callback); return () => { window.removeEventListener('storage', callback); window.removeEventListener('geo-preference', callback); }; }
function usePreference<T>(key: string): T | null {
  const raw = useSyncExternalStore(subscribe, () => { try { return localStorage.getItem(key); } catch { return null; } }, () => null);
  try { return raw ? JSON.parse(raw) as T : null; } catch { return null; }
}
function save(key: string, value: unknown) { try { localStorage.setItem(key, JSON.stringify(value)); window.dispatchEvent(new Event('geo-preference')); return true; } catch { return false; } }
export function useReference() { return usePreference<Reference>('geo-reference'); }
export function ExplorationTracker() {
  const pathname = usePathname(); const params = useSearchParams();
  useEffect(() => { if (/^\/(tree|person\/[^/]+|map|timeline)$/.test(pathname)) save('geo-last', pathname + (params.size ? `?${params}` : '')); }, [pathname, params]);
  return null;
}
export function PersonalJourney() {
  const reference = usePreference<Reference>('geo-reference');
  const value = usePreference<string>('geo-last');
  const last = typeof value === 'string' && /^\/(tree|person\/|map|timeline)/.test(value) ? value : null;
  return <section className="journey-card" aria-labelledby="journey-title">
    <div><p className="eyebrow">Votre histoire commence ici</p><h2 id="journey-title">{reference ? `À partir de ${reference.name}` : 'Retrouvez votre place dans la famille'}</h2><p>Choisissez votre fiche pour explorer vos ancêtres et comprendre vos liens de parenté.</p></div>
    <div className="action-row"><Link className="primary-action" href={reference ? `/tree?focus=${encodeURIComponent(reference.id)}` : '/search?choose=me'}>{reference ? 'Explorer mes ancêtres' : 'Me retrouver dans l’arbre'}</Link>{last && <Link className="secondary-action" href={last}>Reprendre mon exploration</Link>}{reference && <Link href="/search?choose=me">Changer de personne</Link>}</div>
    <p className="helper-text">Votre point de départ est mémorisé sur cet appareil.</p>
  </section>;
}
export function PersonJourney({ id, name }: Reference) {
  const reference = usePreference<Reference>('geo-reference');
  const [message, setMessage] = useState('');
  return <div className="person-journey action-row">
    <button className="secondary-action" onClick={() => { const next = { id, name }; setMessage(save('geo-reference', next) ? 'Votre point de départ est mémorisé.' : 'Votre navigateur ne permet pas la mémorisation.'); }}>{reference?.id === id ? 'Ma personne de référence' : 'C’est moi / choisir comme point de départ'}</button>
    {reference && reference.id !== id && <Link className="primary-action" href={`/relation?from=${encodeURIComponent(reference.id)}&to=${encodeURIComponent(id)}`}>Quel est mon lien avec cette personne ?</Link>}
    <span role="status">{message}</span>
  </div>;
}
