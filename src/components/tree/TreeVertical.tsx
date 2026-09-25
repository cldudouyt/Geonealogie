'use client';

import { Fragment, useLayoutEffect, useRef } from 'react';
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

/* ── Generation labels ──────────────────────────────────────── */
function ancestorLabel(gen: number): string {
  if (gen === 1) return 'Parents';
  if (gen === 2) return 'Grands-parents';
  if (gen === 3) return 'Arrière-grands-parents';
  return `Aïeux (G${gen})`;
}

function descendantLabel(gen: number): string {
  if (gen === 1) return 'Enfants';
  if (gen === 2) return 'Petits-enfants';
  if (gen === 3) return 'Arrière-petits-enfants';
  return `Descendants (G${gen})`;
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
  anchorRef,
}: {
  person: TreeNode;
  isCenter: boolean;
  isSibling?: boolean;
  onClick: () => void;
  anchorRef?: React.Ref<HTMLDivElement>;
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
      ref={anchorRef}
      role="button"
      tabIndex={0}
      aria-label={`Explorer ${person.displayName}`}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
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
  anchorRef,
}: {
  persons: TreeNode[];
  centerIds: Set<string>;
  onNav: (id: string) => void;
  label?: string;
  isSiblings?: boolean;
  anchorRef?: React.Ref<HTMLDivElement>;
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
            anchorRef={centerIds.has(p.id) ? anchorRef : undefined}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Pedigree grouping ──────────────────────────────────────── */
interface CoupleGroup {
  childName: string;
  parents: TreeNode[];
}

function sortParents(parents: TreeNode[]): TreeNode[] {
  const rank = (p: TreeNode) => (p.sex === 'M' ? 0 : p.sex === 'F' ? 1 : 2);
  return [...parents].sort((a, b) => rank(a) - rank(b));
}

function firstName(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] ?? displayName;
}

function CoupleBox({
  group,
  centerIds,
  onNav,
}: {
  group: CoupleGroup;
  centerIds: Set<string>;
  onNav: (id: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {group.parents.map(p => (
          <PersonCard key={p.id} person={p} isCenter={centerIds.has(p.id)} onClick={() => onNav(p.id)} />
        ))}
      </div>
      {group.parents.length > 1 && (
        <div aria-hidden="true" style={{
          alignSelf: 'stretch',
          margin: '0 60px',
          height: 8,
          borderLeft: '2px solid #d8cfb8',
          borderRight: '2px solid #d8cfb8',
          borderBottom: '2px solid #d8cfb8',
          borderRadius: '0 0 6px 6px',
        }} />
      )}
      <div style={{ fontSize: 10.5, color: '#8a8474', marginTop: 4, whiteSpace: 'nowrap' }}>
        Parents de {group.childName}
      </div>
    </div>
  );
}

function GroupRow({
  groups,
  centerIds,
  onNav,
}: {
  groups: CoupleGroup[];
  centerIds: Set<string>;
  onNav: (id: string) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 28, justifyContent: 'center', alignItems: 'flex-start', padding: '0 12px' }}>
      {groups.map((g, i) => (
        <CoupleBox key={`${g.childName}-${i}-${g.parents[0]?.id}`} group={g} centerIds={centerIds} onNav={onNav} />
      ))}
    </div>
  );
}

const SIDE_LABEL: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: '.14em',
  textTransform: 'uppercase',
  color: '#2f5142',
  background: '#eef2ec',
  borderRadius: 999,
  padding: '3px 12px',
  justifySelf: 'center',
};

const GEN_LABEL: React.CSSProperties = {
  fontSize: 10.5,
  letterSpacing: '.14em',
  textTransform: 'uppercase',
  color: '#8a8474',
  textAlign: 'center',
  margin: '18px 0 8px',
};

/* ── Main component ─────────────────────────────────────────── */
export default function TreeVertical({ treeData, focusId, onFocus }: TreeVerticalProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const focusCardRef = useRef<HTMLDivElement>(null);
  const { nodes, links, rootId } = treeData;

  const nodeMap = new Map<string, TreeNode>(nodes.map(n => [n.id, n]));
  const effectiveId = rootId || focusId;
  const focusNode = nodeMap.get(effectiveId);

  useLayoutEffect(() => {
    const container = scrollRef.current;
    const card = focusCardRef.current;
    if (!container || !card) return;
    const c = container.getBoundingClientRect();
    const r = card.getBoundingClientRect();
    container.scrollLeft += (r.left + r.width / 2) - (c.left + c.width / 2);
  }, [treeData, effectiveId]);

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
  const parentsOf = (id: string, seen: Set<string>): TreeNode[] =>
    sortParents(
      [...new Set(childToParents.get(id) ?? [])]
        .filter(pid => !seen.has(pid))
        .map(pid => nodeMap.get(pid))
        .filter(Boolean) as TreeNode[],
    );

  /* Parents (generation 1) then, per side, couples grouped by the child they belong to */
  const seenUp = new Set<string>([focusNode.id]);
  const parents = parentsOf(focusNode.id, seenUp);
  for (const p of parents) seenUp.add(p.id);
  const parentIds = parents.map(p => p.id);
  const father = parents.find(p => p.sex === 'M') ?? parents.find(p => p.sex !== 'F');
  const mother = parents.find(p => p !== father && p.sex !== 'M');

  function sideLevels(start: TreeNode | undefined): CoupleGroup[][] {
    const levels: CoupleGroup[][] = [];
    let frontier = start ? [start] : [];
    while (frontier.length > 0) {
      const groups: CoupleGroup[] = [];
      const next: TreeNode[] = [];
      for (const child of frontier) {
        const ps = parentsOf(child.id, seenUp);
        if (ps.length === 0) continue;
        for (const p of ps) seenUp.add(p.id);
        groups.push({ childName: firstName(child.displayName), parents: ps });
        next.push(...ps);
      }
      if (groups.length === 0) break;
      levels.push(groups);
      frontier = next;
    }
    return levels;
  }

  const paternal = sideLevels(father);
  const maternal = sideLevels(mother);
  const upperGens = Math.max(paternal.length, maternal.length);

  /* Descendant levels: [enfants, petits-enfants, …] */
  const descendantLevels: TreeNode[][] = [];
  const seenDown = new Set<string>([focusNode.id]);
  let frontierDown = [focusNode.id];
  while (frontierDown.length > 0) {
    const nextIds = [...new Set(frontierDown.flatMap(id => parentToChildren.get(id) ?? []))]
      .filter(id => !seenDown.has(id));
    const level = nextIds.map(id => nodeMap.get(id)).filter(Boolean) as TreeNode[];
    if (level.length === 0) break;
    for (const p of level) seenDown.add(p.id);
    descendantLevels.push(level);
    frontierDown = level.map(p => p.id);
  }

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
    if (onFocus) {
      onFocus(id, nodeMap.get(id)?.displayName);
    } else {
      router.push(`/person/${encodeURIComponent(id)}`);
    }
  };

  const hasSiblings = siblings.length > 0;
  const hasAncestors = parents.length > 0;

  return (
    <div ref={scrollRef} style={{ overflowX: 'auto', padding: '32px 0 24px' }}>
      <div
        style={{
          width: 'max-content',
          minWidth: '100%',
          padding: '0 24px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0,
        }}
      >
        {/* Older generations: paternal side | maternal side, oldest first */}
        {upperGens > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1px auto', columnGap: 24, alignItems: 'start' }}>
            <span style={{ ...SIDE_LABEL, gridRow: 1, gridColumn: 1, visibility: paternal.length ? 'visible' : 'hidden' }}>Côté paternel</span>
            <div style={{ gridRow: `1 / span ${upperGens * 2 + 1}`, gridColumn: 2, background: '#e0d8c6', alignSelf: 'stretch' }} />
            <span style={{ ...SIDE_LABEL, gridRow: 1, gridColumn: 3, visibility: maternal.length ? 'visible' : 'hidden' }}>Côté maternel</span>
            {Array.from({ length: upperGens }, (_, i) => {
              const idx = upperGens - 1 - i;
              const gen = idx + 2;
              const row = 2 + i * 2;
              return (
                <Fragment key={`anc-${gen}`}>
                  <div style={{ ...GEN_LABEL, gridRow: row, gridColumn: 1 }}>{paternal[idx] ? ancestorLabel(gen) : ''}</div>
                  <div style={{ ...GEN_LABEL, gridRow: row, gridColumn: 3 }}>{maternal[idx] ? ancestorLabel(gen) : ''}</div>
                  <div style={{ gridRow: row + 1, gridColumn: 1 }}>
                    {paternal[idx] && <GroupRow groups={paternal[idx]} centerIds={centerIds} onNav={nav} />}
                  </div>
                  <div style={{ gridRow: row + 1, gridColumn: 3 }}>
                    {maternal[idx] && <GroupRow groups={maternal[idx]} centerIds={centerIds} onNav={nav} />}
                  </div>
                </Fragment>
              );
            })}
          </div>
        )}

        {hasAncestors && (
          <>
            {upperGens > 0 && <Connector />}
            <GenRow persons={parents} centerIds={centerIds} onNav={nav} label={ancestorLabel(1)} />
          </>
        )}

        {/* Focus generation — [fratrie …, FOCUS, conjoint] in one row */}
        {hasSiblings ? (
          <>
            {hasAncestors && <Connector />}
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
                  <PersonCard
                    key={p.id}
                    person={p}
                    isCenter={centerIds.has(p.id)}
                    onClick={() => nav(p.id)}
                    anchorRef={centerIds.has(p.id) ? focusCardRef : undefined}
                  />
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {hasAncestors && <Connector />}
            <GenRow
              persons={focusRow}
              centerIds={centerIds}
              onNav={nav}
              label={hasAncestors ? undefined : 'Personne de référence'}
              anchorRef={focusCardRef}
            />
          </>
        )}

        {/* Descendant rows */}
        {descendantLevels.map((level, i) => (
          <Fragment key={`desc-${i + 1}`}>
            <Connector />
            <GenRow persons={level} centerIds={centerIds} onNav={nav} label={descendantLabel(i + 1)} />
          </Fragment>
        ))}
      </div>
    </div>
  );
}
