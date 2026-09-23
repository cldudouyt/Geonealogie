import Link from 'next/link';
import { listAllDocuments, isImageMime } from '@/lib/documents-store';
import { getPerson } from '@/lib/gedcom-store';
import type { DocumentMeta } from '@/lib/documents-store';

export const dynamic = 'force-dynamic';

interface PhotoGroup {
  personId: string;
  personName: string;
  photos: DocumentMeta[];
}

export default async function AlbumPage() {
  let groups: PhotoGroup[] = [];

  try {
    const docs = await listAllDocuments();
    const photos = docs.filter(d => !d.deletionPending && isImageMime(d.mimeType));

    // Group by personId
    const byPerson = new Map<string, DocumentMeta[]>();
    for (const photo of photos) {
      const existing = byPerson.get(photo.personId) ?? [];
      existing.push(photo);
      byPerson.set(photo.personId, existing);
    }

    // Resolve person names
    const entries = await Promise.all(
      Array.from(byPerson.entries()).map(async ([personId, personPhotos]) => {
        const person = await getPerson(personId).catch(() => undefined);
        return {
          personId,
          personName: person?.displayName ?? personId,
          photos: personPhotos,
        };
      })
    );

    // Sort groups by person name
    groups = entries.sort((a, b) => a.personName.localeCompare(b.personName, 'fr'));
  } catch {
    // Show empty state gracefully if DB unavailable
  }

  const totalPhotos = groups.reduce((n, g) => n + g.photos.length, 0);

  return (
    <div style={{ padding: '32px 24px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontFamily: 'var(--font-serif, Georgia, serif)',
          fontSize: 28,
          fontWeight: 600,
          color: 'var(--ink-900, #1c1f1c)',
          marginBottom: 6,
        }}>
          Album familial
        </h1>
        <p style={{ color: 'var(--ink-600, #6b7280)', fontSize: 15 }}>
          Photos et souvenirs de la famille Dudouyt
          {totalPhotos > 0 && (
            <span style={{ marginLeft: 10, color: 'var(--green-700, #2f5142)', fontWeight: 600 }}>
              {totalPhotos} photo{totalPhotos > 1 ? 's' : ''}
            </span>
          )}
        </p>
      </div>

      {/* Empty state */}
      {groups.length === 0 && (
        <div style={{
          background: 'var(--paper-card, #fffdf9)',
          border: '1px solid var(--line, #e7e0d0)',
          borderRadius: 'var(--r-card, 16px)',
          padding: '48px 24px',
          textAlign: 'center',
          color: 'var(--ink-600, #9aa89b)',
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" style={{ margin: '0 auto 16px', display: 'block', opacity: 0.4 }}>
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <path d="m21 15-5-5L5 21"/>
          </svg>
          <p style={{ fontSize: 15, marginBottom: 6 }}>Aucune photo pour le moment.</p>
          <p style={{ fontSize: 13 }}>Ajoutez des photos depuis les fiches personnelles.</p>
        </div>
      )}

      {/* Photo groups */}
      {groups.map(group => (
        <div key={group.personId} style={{ marginBottom: 40 }}>
          {/* Group header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Link
              href={`/person/${group.personId}`}
              style={{
                fontFamily: 'var(--font-serif, Georgia, serif)',
                fontSize: 18,
                fontWeight: 600,
                color: 'var(--green-700, #2f5142)',
                textDecoration: 'none',
              }}
            >
              {group.personName}
            </Link>
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--green-700, #2f5142)',
              background: '#eef2ec',
              borderRadius: 999,
              padding: '2px 9px',
            }}>
              {group.photos.length}
            </span>
          </div>

          {/* Photo grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 14,
          }}>
            {group.photos.map(photo => (
              <PhotoCard key={photo.id} photo={photo} personId={group.personId} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PhotoCard({ photo, personId }: { photo: DocumentMeta; personId: string }) {
  const caption = photo.caption || photo.title || photo.originalName;
  const fileUrl = `/api/persons/${personId}/documents/${photo.id}/file`;

  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        background: 'var(--paper-card, #fffdf9)',
        border: '1px solid var(--line, #e7e0d0)',
        borderRadius: 12,
        overflow: 'hidden',
        textDecoration: 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
      className="album-card"
    >
      {/* Thumbnail */}
      <div style={{
        width: '100%',
        aspectRatio: '4 / 3',
        background: 'var(--paper-body, #f4f1ea)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fileUrl}
          alt={caption}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
          loading="lazy"
        />
      </div>

      {/* Caption */}
      <div style={{ padding: '8px 10px 10px' }}>
        <p style={{
          fontSize: 12.5,
          fontWeight: 500,
          color: 'var(--ink-900, #1c1f1c)',
          margin: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {caption}
        </p>
        {photo.takenDate && (
          <p style={{
            fontSize: 11,
            color: 'var(--ink-600, #9aa89b)',
            margin: '3px 0 0',
          }}>
            {photo.takenDate}
          </p>
        )}
      </div>
    </a>
  );
}
