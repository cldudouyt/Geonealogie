'use client';
import { useState } from 'react';
import type { DocumentMeta } from '@/lib/documents-store';
interface Asset { key: string; name: string; data: string; sha256: string }
async function digest(buffer: ArrayBuffer) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', buffer)), b => b.toString(16).padStart(2, '0')).join(''); }
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function BackupTools() {
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);
  async function backup() {
    setBusy(true); setMessage('Préparation du manifeste…');
    try {
      const response = await fetch('/api/export/backup'); if (!response.ok) throw new Error('Sauvegarde indisponible.');
      const manifest = await response.json();
      const docs = Object.values(manifest.documents as Record<string, DocumentMeta[]>).flat();
      const targets = [...docs.map(d => ({ key: `document:${d.id}`, name: d.originalName, url: `/api/persons/${encodeURIComponent(d.personId)}/documents/${encodeURIComponent(d.id)}/file` })), ...(manifest.photos as { personId: string }[]).map(p => ({ key: `photo:${p.personId}`, name: `photo-${p.personId}`, url: `/api/admin/backup-photo?id=${encodeURIComponent(p.personId)}` }))];
      const files: Asset[] = []; let size = 0;
      for (const [i, target] of targets.entries()) {
        setMessage(`Sauvegarde des fichiers : ${i + 1} / ${targets.length}`);
        const res = await fetch(target.url); if (!res.ok) throw new Error(`Fichier inaccessible : ${target.name}. Aucune sauvegarde complète créée.`);
        const blob = await res.blob(); size += blob.size;
        if (size > 100 * 1024 * 1024) throw new Error('Plus de 100 Mo de médias : un export administrateur hors navigateur est nécessaire.');
        const sha256 = await digest(await blob.arrayBuffer());
        const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob); });
        files.push({ key: target.key, name: target.name, data, sha256 });
      }
      const fresh = await fetch('/api/export/backup'); if (!fresh.ok) throw new Error('Vérification finale impossible.');
      const check = await fresh.json();
      if (JSON.stringify([manifest.overrides, manifest.documents, manifest.narratives, manifest.photos]) !== JSON.stringify([check.overrides, check.documents, check.narratives, check.photos])) throw new Error('Des données ont changé pendant la sauvegarde. Relancez-la.');
      download(new Blob([JSON.stringify({ ...manifest, format: 'geonealogie-backup-v2', assets: files, note: 'Données, portraits, documents et photos inclus ; empreintes SHA-256 des fichiers.' })], { type: 'application/json' }), `geonealogie-${new Date().toISOString().slice(0, 10)}.json`);
      setMessage(`Sauvegarde créée : ${files.length} fichier(s) inclus.`);
    } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  async function inspect(file?: File) {
    if (!file) return; setBusy(true); setAssets([]);
    try {
      if (file.size > 150 * 1024 * 1024) throw new Error('Archive trop volumineuse pour ce navigateur.');
      const archive = JSON.parse(await file.text());
      if (archive.format !== 'geonealogie-backup-v2' || !Array.isArray(archive.assets) || typeof archive.gedcom !== 'string') throw new Error('Format de sauvegarde non reconnu.');
      for (const asset of archive.assets as Asset[]) {
        if (typeof asset.data !== 'string' || !/^data:[^,]*;base64,/.test(asset.data) || typeof asset.name !== 'string') throw new Error('Fichier invalide dans l’archive.');
        const bytes = Uint8Array.from(atob(asset.data.split(',')[1]), c => c.charCodeAt(0));
        if (await digest(bytes.buffer) !== asset.sha256) throw new Error(`Fichier altéré : ${asset.name}`);
      }
      setAssets(archive.assets); setMessage(`Archive vérifiée : ${archive.assets.length} fichier(s). Vous pouvez récupérer les médias ci-dessous. Pour une fiche, utilisez l’historique ; une restauration complète du GEDCOM nécessite une intervention administrateur.`);
      download(new Blob([archive.gedcom], { type: 'text/plain' }), 'genealogie-restauration.ged');
    } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  return <section className="source-item"><h2>Sauvegarde et récupération</h2><p>La sauvegarde inclut les données, portraits, documents et photos accessibles (100 Mo de médias maximum). Un fichier inaccessible bloque l’export complet. Conservez le fichier dans un emplacement privé.</p><button className="primary-action" disabled={busy} onClick={backup}>Télécharger la sauvegarde avec fichiers</button><details><summary>Récupérer les fichiers d’une sauvegarde</summary><p>Choisissez une archive : ses fichiers sont vérifiés sur cet appareil. Le GEDCOM est téléchargé ; vous pouvez récupérer les médias pour les remettre sur une fiche.</p><input type="file" accept="application/json,.json" aria-label="Sauvegarde à vérifier" disabled={busy} onChange={e => inspect(e.target.files?.[0])} />{assets.map(a => <p key={a.key}><button className="secondary-action" onClick={() => { const bytes = Uint8Array.from(atob(a.data.split(',')[1]), c => c.charCodeAt(0)); download(new Blob([bytes]), a.name); }}>{a.name}</button></p>)}</details><p role="status">{message}</p></section>;
}
