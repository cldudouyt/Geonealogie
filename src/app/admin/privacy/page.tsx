import { requireRole } from '@/lib/session';
import { readState } from '@/lib/state-store';
import type { DocumentMeta } from '@/lib/documents-store';
import MigrateButton from './MigrateButton';
export default async function PrivacyPage() {
  await requireRole('admin');
  const docs = Object.values(await readState<Record<string, DocumentMeta[]>>('documents', {})).flat().filter(d => d.access !== 'private' || d.legacyPublicUrl);
  return <main className="content-page"><h1>Confidentialité des documents</h1><p>Chaque migration copie le fichier vers un stockage privé, vérifie la copie, puis supprime son ancienne URL publique. Si la suppression échoue, elle reste à terminer ici.</p><p>Le stockage Blob doit accepter les fichiers privés. Les copies déjà téléchargées par des tiers ne peuvent pas être révoquées.</p><p>{docs.length} document(s) à traiter</p>{docs.map(d => <section className="source-item" key={d.id}><h2>{d.title || d.originalName}</h2><p>{d.legacyPublicUrl ? 'Copie privée créée ; suppression publique en attente.' : 'Document ancien, accès à vérifier.'}</p><MigrateButton id={d.id} /></section>)}</main>;
}
