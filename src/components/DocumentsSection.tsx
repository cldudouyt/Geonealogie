'use client';

import { useState, useRef } from 'react';
import { useSession } from './SessionContext';
import { upload } from '@vercel/blob/client';
import type { DocumentMeta } from '@/lib/documents-store';

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
        // Upload direct depuis le navigateur vers Vercel Blob (contourne la limite 4.5 Mo)
        const blob = await upload(file.name, file, {
          access: 'private',
          handleUploadUrl: '/api/blob-upload',
        });
        // Enregistrement des métadonnées uniquement (JSON)
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
        if (!res.ok) {
          setError(data.error || 'Erreur lors de l\'enregistrement');
          return;
        }
        setDocs(prev => [...prev, data.document]);
      } else {
        // Mode local : envoi du fichier via FormData
        const fd = new FormData(e.currentTarget);
        const res = await fetch(`/api/persons/${personId}/documents`, {
          method: 'POST',
          body: fd,
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Erreur lors du téléversement');
          return;
        }
        setDocs(prev => [...prev, data.document]);
      }
      formRef.current?.reset();
    } catch {
      setError('Erreur lors du téléversement');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string, docName: string) => {
    if (!confirm(`Supprimer « ${docName} » ?`)) return;
    try {
      const res = await fetch(`/api/persons/${personId}/documents/${docId}`, {
        method: 'DELETE',
      });
      if (res.ok) setDocs(prev => prev.filter(d => d.id !== docId));
      else setError('Erreur lors de la suppression');
    } catch {
      setError('Erreur réseau');
    }
  };

  return (
    <div className="bg-[#fffdf9] border border-[#e7e0d0] rounded-2xl p-6 mt-6">
      <h2 className="text-lg font-semibold mb-4 text-[#1c1f1c]" style={{ fontFamily: 'var(--font-serif, Georgia, serif)' }}>Documents</h2>

      {/* Liste */}
      {docs.length > 0 && (
        <ul className="divide-y divide-[#f1ebdd] mb-5">
          {docs.map(doc => (
            <li key={doc.id} className="flex items-center gap-3 py-3">
              <span className="text-xl shrink-0 select-none">
                {MIME_ICON[doc.mimeType] ?? '📎'}
              </span>
              <div className="flex-1 min-w-0">
                <a
                  href={`/api/persons/${personId}/documents/${doc.id}/file`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-[#2f5142] hover:underline truncate block"
                >
                  {doc.title || doc.originalName}
                </a>
                <p className="text-xs text-[#9aa89b] mt-0.5">
                  {doc.title && doc.originalName !== doc.title && `${doc.originalName} · `}
                  {formatSize(doc.size)} · {new Date(doc.uploadedAt).toLocaleDateString('fr-FR')}
                </p>
              </div>
              {canEdit && <button
                onClick={() => handleDelete(doc.id, doc.title || doc.originalName)}
                className="shrink-0 p-1.5 text-[#9aa89b] hover:text-[#b91c1c] transition-colors rounded"
                title="Supprimer ce document"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>}
            </li>
          ))}
        </ul>
      )}

      {/* Formulaire d'ajout */}
      {canEdit && <form ref={formRef} onSubmit={handleUpload}>
        <p className="text-xs text-[#8a8474] mb-3">
          Formats acceptés : PDF, images (JPG, PNG…), Word, texte · Max 10 Mo
        </p>
        <div className="flex flex-wrap gap-3 items-end">
          <input
            ref={titleRef}
            name="title"
            type="text"
            placeholder="Titre (facultatif)"
            className="flex-1 min-w-40 px-3 py-2 text-sm bg-[#fffdf9] text-[#1c1f1c] border border-[#e0d8c6] rounded-[11px] outline-none focus:border-[#2f5142] focus:ring-2 focus:ring-[#2f5142]/10 transition-all"
          />
          <input
            ref={fileRef}
            name="file"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.txt"
            required
            className="text-sm text-[#8a8474] file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#eef2ec] file:text-[#2f5142] hover:file:bg-[#e3eae1] file:cursor-pointer file:transition-colors"
          />
          <button
            type="submit"
            disabled={uploading}
            className="px-4 py-2 bg-[#1e3a2f] text-[#f1ede2] rounded-[10px] text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity whitespace-nowrap"
          >
            {uploading ? 'Envoi…' : 'Ajouter'}
          </button>
        </div>
        {error && <p className="text-xs text-[#b91c1c] mt-2">{error}</p>}
      </form>}
    </div>
  );
}
