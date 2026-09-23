import Link from 'next/link';
import { requireRole } from '@/lib/session';
export default async function AdminPage() {
  await requireRole('admin');
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  return <main className="content-page"><h1>Administration</h1><section className="source-item"><h2>Version du site</h2><p>Environnement : {process.env.VERCEL_ENV || 'Local'}</p><p>Branche : {process.env.VERCEL_GIT_COMMIT_REF || 'Non renseignée'}</p><p>Version : {sha ? <a href={`https://github.com/cldudouyt/Geonealogie/commit/${sha}`}>{sha.slice(0, 7)}</a> : 'Non renseignée'}</p><a href="https://vercel.com/cldudouyts-projects/genealogie">Voir les déploiements Vercel</a></section><div className="action-row"><Link href="/admin/privacy">Confidentialité des documents</Link><Link href="/history">Historique et sauvegardes</Link><Link href="/anomalies">À vérifier</Link><Link href="/admin/geocode">Géocodage</Link></div></main>;
}
