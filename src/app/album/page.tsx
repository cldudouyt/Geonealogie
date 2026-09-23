import Link from 'next/link';
import { listAllDocuments, isImageMime } from '@/lib/documents-store';
import { getAllPersons } from '@/lib/gedcom-store';
import type { DocumentMeta } from '@/lib/documents-store';

export const dynamic = 'force-dynamic';

type PhotoItem =
  | { kind: 'avatar'; url: string; name: string }
  | { kind: 'doc'; doc: DocumentMeta };

interface PhotoGroup {
  personId: string;
  personName: string;
  items: PhotoItem[];
}

export default async function AlbumPage() {
  let groups: PhotoGroup[] = [];

  try {
    const [persons, docs] = await Promise.all([
      getAllPersons(),
      listAllDocuments(),
    ]);

    const byPerson = new Map<string, PhotoGroup>();

    // Avatars (photos de profil)
    for (const person of persons) {
      if (!person.photoUrl) continue;
      byPerson.set(person.id, {
        personId: person.id,
        personName: person.displayName ?? person.id,
        items: [{ kind: 'avatar', url: person.photoUrl, name: 'Photo de profil' }],
      });
    }

    // Documents images
    for (const doc of docs) {
      if (doc.deletionPending || !isImageMime(doc.mimeType)) continue;
      const existing = byPerson.get(doc.personId);
      if (existing) {
        existing.items.push({ kind: 'doc', doc });
      } else {
        const person = persons.find(p => p.id === doc.personId);
        byPerson.set(doc.personId, {
          personId: doc.personId,
          personName: person?.displayName ?? doc.personId,
          items: [{ kind: 'doc', doc }],
        });
      }
    }

    groups = Array.from(byPerson.values()).sort((a, b) =>
      a.personName.localeCompare(b.personName, 'fr'),
    );
  } catch {
    // Show empty state gracefully if DB unavailable
  }

  const totalPhotos = groups.reduce((n, g) => n + g.items.length, 0);

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
              {group.items.length}
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 14,
          }}>
            {group.items.map((item) =>
              item.kind === 'avatar'
                ? <AvatarCard key={`avatar-${group.personId}`} url={item.url} name={item.name} personId={group.personId} />
                : <DocCard key={item.doc.id} doc={item.doc} personId={group.personId} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function AvatarCard({ url, name, personId }: { url: string; name: string; personId: string }) {
  return (
    <a
      href={`/person/${personId}`}
      style={{
        display: 'block',
        background: 'var(--paper-card, #fffdf9)',
        border: '1px solid var(--line, #e7e0d0)',
        borderRadius: 12,
        overflow: 'hidden',
        textDecoration: 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        position: 'relative',
      }}
    >
      <div style={{ width: '100%', aspectRatio: '4 / 3', background: 'var(--paper-body, #f4f1ea)', overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
      </div>
      <div style={{ padding: '8px 10px 10px' }}>
        <p style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink-900, #1c1f1c)', margin: 0 }}>{name}</p>
        <p style={{ fontSize: 11, color: 'var(--ink-600, #9aa89b)', margin: '3px 0 0' }}>Photo de profil</p>
      </div>
    </a>
  );
}

function DocCard({ doc, personId }: { doc: DocumentMeta; personId: string }) {
  const caption = doc.caption || doc.title || doc.originalName;
  const fileUrl = `/api/persons/${personId}/documents/${doc.id}/file`;

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
    >
      <div style={{ width: '100%', aspectRatio: '4 / 3', background: 'var(--paper-body, #f4f1ea)', overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={fileUrl} alt={caption} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
      </div>
      <div style={{ padding: '8px 10px 10px' }}>
        <p style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink-900, #1c1f1c)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {caption}
        </p>
        {doc.takenDate && (
          <p style={{ fontSize: 11, color: 'var(--ink-600, #9aa89b)', margin: '3px 0 0' }}>{doc.takenDate}</p>
        )}
      </div>
    </a>
  );
}
