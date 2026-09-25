'use client';

import { useState, useRef } from 'react';
import { useSession } from './SessionContext';
import { upload } from '@vercel/blob/client';
import type { DocumentMeta } from '@/lib/documents-store';

function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

const USE_BLOB = process.env.NEXT_PUBLIC_USE_BLOB === 'true';

const MIME_ICON: Record<string, string> = {
  'application/pdf': '📄',
  'image/jpeg': '🖼️',
  'image/png': '🖼️',
  'image/gif': '🖼️',
  'image/webp': '🖼️',
  'text/plain': '📝',
  'application/msword': '📝',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

export default function DocumentsSection({
  personId,
  initialDocs,
}: {
  personId: string;
  initialDocs: DocumentMeta[];
}) {
  const [docs, setDocs] = useState(initialDocs);
  const { canEdit } = useSession();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      if (USE_BLOB) {
        const safeName = file.name.normalize('NFKD').replace(/[^\w.-]+/g, '_').replace(/^[._]+/, '').slice(-100) || 'document';
        const blob = await upload(`documents/${personId}/${safeName}`, file, {
          access: 'private',
          handleUploadUrl: '/api/blob-upload',
        });
        const res = await fetch(`/api/persons/${personId}/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: blob.url,
            originalName: file.name,
            title: titleRef.current?.value.trim() || undefined,
            mimeType: file.type,
            size: file.size,
          }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || "Erreur lors de l'enregistrement"); return; }
        setDocs(prev => [...prev, data.document]);
      } else {
        const fd = new FormData(e.currentTarget);
        const res = await fetch(`/api/persons/${personId}/documents`, { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) { setError(data.error || 'Erreur lors du téléversement'); return; }
        setDocs(prev => [...prev, data.document]);
      }
      formRef.current?.reset();
      setFileName('');
    } catch {
      setError('Erreur lors du téléversement');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string, docName: string) => {
    if (!confirm(`Supprimer « ${docName} » ?`)) return;
    try {
      const res = await fetch(`/api/persons/${personId}/documents/${docId}`, { method: 'DELETE' });
      if (res.ok) {
        setDocs(prev => prev.filter(d => d.id !== docId));
      } else {
        const data = await res.json();
        setError(data.error || 'Erreur lors de la suppression');
        if (data.deletionPending) setDocs(prev => prev.map(d => d.id === docId ? { ...d, deletionPending: true } : d));
      }
    } catch {
      setError('Erreur réseau');
    }
  };

  return (
    <div className="bg-[#fffdf9] border border-[#e7e0d0] rounded-2xl p-6 mt-6">
      <h2 className="text-lg font-semibold mb-4 text-[#1c1f1c]" style={{ fontFamily: 'var(--font-serif, Georgia, serif)' }}>Photos & documents</h2>

      {/* Liste */}
      {docs.length > 0 && (
        <ul className="divide-y divide-[#f1ebdd] mb-5">
          {docs.map(doc => {
            const fileUrl = `/api/persons/${personId}/documents/${doc.id}/file`;
            const isImage = isImageMime(doc.mimeType);
            return (
              <li key={doc.id} className="flex items-center gap-3 py-3">
                {isImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={fileUrl}
                    alt={doc.title || doc.originalName}
                    style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 6, flexShrink: 0, background: '#f4f1ea' }}
                  />
                ) : (
                  <span className="text-xl shrink-0 select-none">{MIME_ICON[doc.mimeType] ?? '📎'}</span>
                )}
                <div className="flex-1 min-w-0">
                  {doc.deletionPending
                    ? <p className="text-sm">{doc.title || doc.originalName} — suppression en attente</p>
                    : <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-[#2f5142] hover:underline truncate block">
                        {doc.title || doc.originalName}
                      </a>
                  }
                  <p className="text-xs text-[#9aa89b] mt-0.5">
                    {doc.title && doc.originalName !== doc.title && `${doc.originalName} · `}
                    {formatSize(doc.size)} · {new Date(doc.uploadedAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => handleDelete(doc.id, doc.title || doc.originalName)}
                    style={{ flexShrink: 0, padding: 10, color: '#9aa89b', borderRadius: 8, minWidth: 40, minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    aria-label={doc.deletionPending ? 'Réessayer la suppression' : 'Supprimer ce document'}
                    title={doc.deletionPending ? 'Réessayer la suppression' : 'Supprimer ce document'}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!canEdit && docs.length === 0 && (
        <p style={{ fontSize: 13, color: '#9aa89b', fontStyle: 'italic', marginBottom: 8 }}>Aucun document partagé pour cette personne.</p>
      )}

      {/* Formulaire d'ajout — mobile-first, tout en colonne */}
      {canEdit && (
        <form ref={formRef} onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Zone de sélection fichier */}
          <label style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '14px 16px', borderRadius: 12,
            border: fileName ? '1.5px solid #2f5142' : '1.5px dashed #c9a86a',
            background: fileName ? '#eef2ec' : '#fffdf9',
            cursor: 'pointer', minHeight: 52,
            color: fileName ? '#2f5142' : '#8a8474', fontSize: 14,
            transition: 'all .15s',
          }}>
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0, color: fileName ? '#2f5142' : '#c9a86a' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {fileName || 'Choisir une photo ou un fichier…'}
            </span>
            <input
              ref={fileRef}
              name="file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.txt"
              required
              className="sr-only"
              onChange={e => setFileName(e.target.files?.[0]?.name ?? '')}
            />
          </label>

          {/* Titre */}
          <input
            ref={titleRef}
            name="title"
            type="text"
            placeholder="Titre (facultatif)"
            style={{
              width: '100%', padding: '12px 14px', fontSize: 14,
              background: '#fffdf9', color: '#1c1f1c',
              border: '1px solid #e0d8c6', borderRadius: 11, outline: 'none',
              boxSizing: 'border-box',
            }}
          />

          {/* Bouton envoi — pleine largeur, tap-friendly */}
          <button
            type="submit"
            disabled={uploading || !fileName}
            style={{
              width: '100%', padding: '14px', minHeight: 52,
              background: uploading || !fileName ? '#c8c2b6' : '#1e3a2f',
              color: '#f1ede2', borderRadius: 12,
              fontSize: 15, fontWeight: 600,
              cursor: uploading || !fileName ? 'default' : 'pointer',
              transition: 'background .15s',
            }}
          >
            {uploading ? 'Envoi en cours…' : 'Ajouter'}
          </button>

          {error && <p style={{ fontSize: 13, color: '#b91c1c' }}>{error}</p>}
          <p style={{ fontSize: 12, color: '#9aa89b' }}>PDF, photos (JPG, PNG…), Word · Max 10 Mo</p>
        </form>
      )}
    </div>
  );
}
