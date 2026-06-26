'use client';

import { useRouter } from 'next/navigation';
import type { TreeData, TreeNode } from '@/lib/types';

interface TreeVerticalProps {
  treeData: TreeData;
  focusId: string;
  onFocus?: (id: string, name?: string) => void;
}

/* ── card dimensions (spec) ─────────────────────────────────── */
const CARD_W_NORMAL  = 178;
const CARD_W_CENTRAL = 204;
const CONNECTOR_H    = 30;

/* ── Render person name with surname highlighted green ─────── */
function renderName(displayName: string, isCenter: boolean): React.ReactNode {
  const words = displayName.trim().split(/\s+/);
  return words.map((word, i) => {
    const isSurname = word.length >= 2 && word === word.toUpperCase() && /[A-ZÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ]/.test(word);
    return (
      <span key={i}>
        {i > 0 && ' '}
        <span style={{ color: isSurname && !isCenter ? '#2f5142' : undefined }}>
          {word}
        </span>
      </span>
    );
  });
}

function cardBorder(s: 'M' | 'F' | 'U', isCenter: boolean): React.CSSProperties {
  if (isCenter) {
    return { border: '1px solid #2f5142' };
  }
  if (s === 'M') return { border: '1px solid #d6e0ea', borderTop: '3px solid #5b7da3' };
  if (s === 'F') return { border: '1px solid #ecd9d6', borderTop: '3px solid #b5736b' };
  return { border: '1px solid #e7e0d0', borderTop: '3px solid #8a9a8a' };
}

function cardBg(isCenter: boolean): React.CSSProperties {
  if (isCenter) return { background: 'linear-gradient(160deg,#1e3a2f,#15271f)' };
  return { background: '#fff' };
}

/* ── PersonCard ─────────────────────────────────────────────── */
function PersonCard({
  person,
  isCenter,
  isSibling,
  onClick,
}: {
  person: TreeNode;
  isCenter: boolean;
  isSibling?: boolean;
  onClick: () => void;
}) {
  const w = isCenter ? CARD_W_CENTRAL : CARD_W_NORMAL;
  const s = person.sex ?? 'U';
  const nameColor = isCenter ? '#f4efe3' : '#1c1f1c';
  const metaColor = isCenter ? '#9fb0a1' : '#8a8474';

  const meta = [
    person.birthYear && person.deathYear
      ? `${person.birthYear} – ${person.deathYear}`
      : person.birthYear
      ? `${person.birthYear}`
      : person.deathYear
      ? `† ${person.deathYear}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      onClick={onClick}
      title={isCenter ? `Voir la fiche de ${person.displayName}` : `Centrer sur ${person.displayName}`}
      style={{
        width: isSibling ? 148 : w,
        borderRadius: 13,
        padding: isSibling ? 10 : 13,
        boxShadow: '0 4px 14px -10px rgba(0,0,0,.4)',
        cursor: 'pointer',
        flexShrink: 0,
        position: 'relative',
        transition: 'box-shadow .15s, transform .15s',
        opacity: isSibling ? 0.82 : 1,
        ...cardBg(isCenter),
        ...cardBorder(s, isCenter),
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 20px -8px rgba(0,0,0,.35)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
        (e.currentTarget as HTMLDivElement).style.opacity = '1';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 14px -10px rgba(0,0,0,.4)';
        (e.currentTarget as HTMLDivElement).style.transform = '';
        (e.currentTarget as HTMLDivElement).style.opacity = isSibling ? '0.82' : '1';
      }}
    >
      {isCenter && (
        <span style={{
          position: 'absolute',
          top: 8,
          right: 8,
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '.08em',
          textTransform: 'uppercase',
          background: 'rgba(201,168,106,.18)',
          color: '#c9a86a',
          borderRadius: 999,
          padding: '2px 7px',
          border: '1px solid rgba(201,168,106,.35)',
        }}>
          Focus
        </span>
      )}
      {person.isAdopted && !isCenter && (
        <span style={{
          position: 'absolute',
          top: 6,
          right: 6,
          fontSize: 8.5,
          fontWeight: 600,
          letterSpacing: '.06em',
          background: '#f0ece4',
          color: '#9a8c74',
          borderRadius: 999,
          padding: '1px 5px',
          border: '1px solid #ddd5c2',
        }}>
          adopté
        </span>
      )}

      <p style={{
        fontSize: isSibling ? 12.5 : 13.5,
        fontWeight: 700,
        color: nameColor,
        margin: 0,
        lineHeight: 1.3,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        paddingRight: isCenter ? 44 : 0,
      }}>
        {renderName(person.displayName, isCenter)}
      </p>

      {meta && (
        <p style={{
          fontSize: isSibling ? 11 : 11.5,
          color: metaColor,
          margin: '4px 0 0',
          lineHeight: 1.3,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {meta}
        </p>
      )}
    </div>
  );
}

/* ── Connector (vertical line between generations) ───────────── */
function Connector() {
  return (
    <div style={{
      width: 2,
      height: CONNECTOR_H,
      background: '#d8cfb8',
      margin: '0 auto',
    }} />
  );
}

/* ── Generation row ─────────────────────────────────────────── */
function GenRow({
  persons,
  centerIds,
  onNav,
  label,
  isSiblings,
}: {
  persons: TreeNode[];
  centerIds: Set<string>;
  onNav: (id: string) => void;
  label?: string;
  isSiblings?: boolean;
}) {
  if (persons.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {label && (
        <div style={{
          fontSize: 10.5,
          letterSpacing: '.14em',
          textTransform: 'uppercase',
          color: isSiblings ? '#b0a892' : '#8a8474',
          textAlign: 'center',
          marginBottom: 8,
        }}>
          {label}
        </div>
      )}
      <div style={{ display: 'flex', gap: isSiblings ? 10 : 14, flexWrap: 'nowrap' }}>
        {persons.map(p => (
          <PersonCard
            key={p.id}
            person={p}
            isCenter={centerIds.has(p.id)}
            isSibling={isSiblings}
            onClick={() => onNav(p.id)}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────── */
export default function TreeVertical({ treeData, focusId, onFocus }: TreeVerticalProps) {
  const router = useRouter();
  const { nodes, links, rootId } = treeData;

  const nodeMap = new Map<string, TreeNode>(nodes.map(n => [n.id, n]));
  const effectiveId = rootId || focusId;
  const focusNode = nodeMap.get(effectiveId);

  /* Build parent / child / spouse maps */
  const childToParents = new Map<string, string[]>();
  const parentToChildren = new Map<string, string[]>();
  const spouseMap = new Map<string, string[]>();

  for (const link of links) {
    if (link.type === 'parent' || link.type === 'adoption') {
      const p = childToParents.get(link.target) ?? [];
      p.push(link.source);
      childToParents.set(link.target, p);

      const c = parentToChildren.get(link.source) ?? [];
      c.push(link.target);
      parentToChildren.set(link.source, c);
    } else if (link.type === 'spouse') {
      const a = spouseMap.get(link.source) ?? [];
      a.push(link.target);
      spouseMap.set(link.source, a);
      const b = spouseMap.get(link.target) ?? [];
      b.push(link.source);
      spouseMap.set(link.target, b);
    }
  }

  if (!focusNode) {
    return (
      <div style={{ padding: 40, color: '#8a8474', textAlign: 'center' }}>
        Personne introuvable
      </div>
    );
  }

  const centerIds = new Set([focusNode.id]);

  const parentIds = [...new Set(childToParents.get(focusNode.id) ?? [])];
  const parents = parentIds.map(id => nodeMap.get(id)).filter(Boolean) as TreeNode[];

  const grandParentIds = parentIds.flatMap(pid => childToParents.get(pid) ?? []);
  const grandParents = [...new Set(grandParentIds)]
    .map(id => nodeMap.get(id))
    .filter(Boolean) as TreeNode[];

  const childIds = [...new Set(parentToChildren.get(focusNode.id) ?? [])];
  const children = childIds.map(id => nodeMap.get(id)).filter(Boolean) as TreeNode[];

  const spouseIds = spouseMap.get(focusNode.id) ?? [];
  const spouses = spouseIds.map(id => nodeMap.get(id)).filter(Boolean) as TreeNode[];
  const focusRow: TreeNode[] = spouses.length > 0 ? [focusNode, ...spouses] : [focusNode];

  /* Siblings: other children of focus's parents */
  const siblingIds = parentIds
    .flatMap(pid => parentToChildren.get(pid) ?? [])
    .filter(id => id !== focusNode.id);
  const siblings = [...new Set(siblingIds)]
    .map(id => nodeMap.get(id))
    .filter(Boolean) as TreeNode[];

  const nav = (id: string) => {
    if (id === focusNode.id) {
      router.push(`/person/${id}`);
    } else if (onFocus) {
      onFocus(id, nodeMap.get(id)?.displayName);
    } else {
      router.push(`/person/${id}`);
    }
  };

  const hasSiblings = siblings.length > 0;

  return (
    <div style={{ overflowX: 'auto', padding: '32px 0 24px' }}>
      <div
        style={{
          minWidth: 920,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0,
        }}
      >
        {grandParents.length > 0 && (
          <>
            <GenRow persons={grandParents} centerIds={centerIds} onNav={nav} label="Grands-parents" />
            <Connector />
          </>
        )}

        {parents.length > 0 && (
          <GenRow persons={parents} centerIds={centerIds} onNav={nav} label="Parents" />
        )}

        {/* Focus generation — [fratrie …, FOCUS, conjoint] in one row */}
        {hasSiblings ? (
          <>
            {parents.length > 0 && <Connector />}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
              {/* Siblings with label */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
                <span style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: '.14em',
                  textTransform: 'uppercase',
                  color: '#b5a890',
                }}>
                  Fratrie
                </span>
                <div style={{ display: 'flex', gap: 10 }}>
                  {siblings.map(s => (
                    <PersonCard key={s.id} person={s} isCenter={false} isSibling onClick={() => nav(s.id)} />
                  ))}
                </div>
              </div>

              {/* Subtle separator */}
              <div style={{ width: 1, height: 56, background: '#ddd5c2', flexShrink: 0 }} />

              {/* Focus + spouse */}
              <div style={{ display: 'flex', gap: 14 }}>
                {focusRow.map(p => (
                  <PersonCard key={p.id} person={p} isCenter={centerIds.has(p.id)} onClick={() => nav(p.id)} />
                ))}
              </div>
            </div>
            {children.length > 0 && <Connector />}
          </>
        ) : (
          <>
            {parents.length > 0 && <Connector />}
            <GenRow
              persons={focusRow}
              centerIds={centerIds}
              onNav={nav}
              label={parents.length === 0 ? 'Personne de référence' : undefined}
            />
            {children.length > 0 && <Connector />}
          </>
        )}

        {children.length > 0 && (
          <GenRow persons={children} centerIds={centerIds} onNav={nav} label="Enfants" />
        )}
      </div>
    </div>
  );
}
