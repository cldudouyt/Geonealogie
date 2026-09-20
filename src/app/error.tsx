'use client';
import Link from 'next/link';
export default function ErrorPage({ reset }: { reset: () => void }) { return <section className="journey-card" role="alert"><h1>Cette page n’a pas pu être chargée</h1><p>Vérifiez votre connexion puis réessayez. Aucune modification n’a été confirmée.</p><button className="primary-action" onClick={reset}>Réessayer</button><Link className="secondary-action" href="/">Revenir à l’accueil</Link></section>; }
