'use client';

import { Fragment, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import type { TreeData, TreeNode } from '@/lib/types';

const NARROW_QUERY = '(max-width: 639.98px)';

function subscribeNarrow(onChange: () => void) {
  const mql = window.matchMedia(NARROW_QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

function useIsNarrow(): boolean {
  return useSyncExternalStore(subscribeNarrow, () => window.matchMedia(NARROW_QUERY).matches, () => false);
}

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
  fluid,
}: {
  person: TreeNode;
  isCenter: boolean;
  isSibling?: boolean;
  onClick: () => void;
  anchorRef?: React.Ref<HTMLDivElement>;
  fluid?: boolean;
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
        width: fluid ? '100%' : isSibling ? 148 : w,
        minWidth: 0,
        minHeight: fluid ? 48 : undefined,
        boxSizing: 'border-box',
        borderRadius: 13,
        padding: fluid ? (isCenter ? '12px 14px' : '9px 10px') : isSibling ? 10 : 13,
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
      {person.isAdopted && !isCenter && !fluid && (
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
        fontSize: fluid ? (isCenter ? 14.5 : 12.5) : isSibling ? 12.5 : 13.5,
        fontWeight: 700,
        color: nameColor,
        margin: 0,
        lineHeight: 1.3,
        overflow: 'hidden',
        paddingRight: isCenter ? 52 : 0,
        ...(fluid
          ? { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflowWrap: 'anywhere' }
          : { textOverflow: 'ellipsis', whiteSpace: 'nowrap' }),
      }}>
        {renderName(person.displayName, isCenter)}
      </p>

      {(meta || (fluid && person.isAdopted && !isCenter)) && (
        <p style={{
          fontSize: isSibling ? 11 : 11.5,
          color: metaColor,
          margin: '4px 0 0',
          lineHeight: 1.3,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          display: fluid ? 'flex' : undefined,
          alignItems: 'center',
          gap: 6,
        }}>
          {meta}
          {fluid && person.isAdopted && !isCenter && (
            <span style={{
              fontSize: 9.5,
              fontWeight: 600,
              letterSpacing: '.04em',
              background: '#f0ece4',
              color: '#7d705a',
              borderRadius: 999,
              padding: '1px 6px',
              border: '1px solid #ddd5c2',
            }}>
              adopté
            </span>
          )}
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
  justify,
}: {
  groups: CoupleGroup[];
  centerIds: Set<string>;
  onNav: (id: string) => void;
  justify: 'flex-start' | 'flex-end';
}) {
  return (
    <div style={{ display: 'flex', gap: 28, justifyContent: justify, alignItems: 'flex-start', padding: '0 12px' }}>
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
};

const GEN_LABEL: React.CSSProperties = {
  fontSize: 10.5,
  letterSpacing: '.14em',
  textTransform: 'uppercase',
  color: '#8a8474',
  textAlign: 'center',
  margin: '18px 0 8px',
};

/* ── Shared data derivation ─────────────────────────────────── */
interface FamilyView {
  nodeMap: Map<string, TreeNode>;
  focusNode: TreeNode;
  parents: TreeNode[];
  paternal: CoupleGroup[][];
  maternal: CoupleGroup[][];
  spouses: TreeNode[];
  siblings: TreeNode[];
  descendantLevels: TreeNode[][];
}

function deriveFamily({ nodes, links, rootId }: TreeData, focusId: string): FamilyView | null {
  const nodeMap = new Map<string, TreeNode>(nodes.map(n => [n.id, n]));
  const focusNode = nodeMap.get(rootId || focusId);
  if (!focusNode) return null;

  const childToParents = new Map<string, string[]>();
  const parentToChildren = new Map<string, string[]>();
  const spouseMap = new Map<string, string[]>();
  const push = (map: Map<string, string[]>, key: string, value: string) => {
    const list = map.get(key) ?? [];
    list.push(value);
    map.set(key, list);
  };
  for (const link of links) {
    if (link.type === 'parent' || link.type === 'adoption') {
      push(childToParents, link.target, link.source);
      push(parentToChildren, link.source, link.target);
    } else if (link.type === 'spouse') {
      push(spouseMap, link.source, link.target);
      push(spouseMap, link.target, link.source);
    }
  }

  const byIds = (ids: Iterable<string>) =>
    [...new Set(ids)].map(id => nodeMap.get(id)).filter(Boolean) as TreeNode[];

  const seenUp = new Set<string>([focusNode.id]);
  const parentsOf = (id: string): TreeNode[] =>
    sortParents(byIds((childToParents.get(id) ?? []).filter(pid => !seenUp.has(pid))));

  const parents = parentsOf(focusNode.id);
  for (const p of parents) seenUp.add(p.id);
  const father = parents.find(p => p.sex === 'M') ?? parents.find(p => p.sex !== 'F');
  const mother = parents.find(p => p !== father && p.sex !== 'M');

  const sideLevels = (start: TreeNode | undefined): CoupleGroup[][] => {
    const levels: CoupleGroup[][] = [];
    let frontier = start ? [start] : [];
    while (frontier.length > 0) {
      const groups: CoupleGroup[] = [];
      const next: TreeNode[] = [];
      for (const child of frontier) {
        const ps = parentsOf(child.id);
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
  };
  const paternal = sideLevels(father);
  const maternal = sideLevels(mother);

  const descendantLevels: TreeNode[][] = [];
  const seenDown = new Set<string>([focusNode.id]);
  let frontierDown = [focusNode.id];
  while (frontierDown.length > 0) {
    const level = byIds(frontierDown.flatMap(id => parentToChildren.get(id) ?? []).filter(id => !seenDown.has(id)));
    if (level.length === 0) break;
    for (const p of level) seenDown.add(p.id);
    descendantLevels.push(level);
    frontierDown = level.map(p => p.id);
  }

  const spouses = byIds(spouseMap.get(focusNode.id) ?? []);
  const siblings = byIds(parents.flatMap(p => parentToChildren.get(p.id) ?? []).filter(id => id !== focusNode.id));

  return { nodeMap, focusNode, parents, paternal, maternal, spouses, siblings, descendantLevels };
}

/* ── Mobile layout ──────────────────────────────────────────── */
type Side = 'paternal' | 'maternal';

const TWO_COL: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 10,
  alignItems: 'start',
};

const MOBILE_LABEL: React.CSSProperties = { ...GEN_LABEL, margin: '6px 0 8px' };

function MobileConnector() {
  return <div aria-hidden="true" style={{ width: 2, height: 16, background: '#d8cfb8', margin: '6px auto' }} />;
}

function CardGrid({ persons, onNav, isSibling }: { persons: TreeNode[]; onNav: (id: string) => void; isSibling?: boolean }) {
  return (
    <div style={TWO_COL}>
      {persons.map(p => (
        <PersonCard key={p.id} person={p} isCenter={false} isSibling={isSibling} fluid onClick={() => onNav(p.id)} />
      ))}
    </div>
  );
}

function OlderAncestors({
  side,
  levels,
  open,
  onToggle,
  onNav,
}: {
  side: Side;
  levels: CoupleGroup[][];
  open: boolean;
  onToggle: () => void;
  onNav: (id: string) => void;
}) {
  if (levels.length === 0) return <div />;
  const count = levels.reduce((n, level) => n + level.reduce((m, g) => m + g.parents.length, 0), 0);
  const sideName = side === 'paternal' ? 'Côté paternel' : 'Côté maternel';
  const listId = `tree-older-${side}`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${sideName} : ${open ? 'masquer' : 'afficher'} les arrière-grands-parents (${count})`}
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          minHeight: 44,
          padding: '8px 10px',
          borderRadius: 10,
          border: '1px solid #e0d8c6',
          background: '#fffdf9',
          color: '#2f5142',
          fontFamily: 'inherit',
          fontSize: 12.5,
          fontWeight: 600,
          lineHeight: 1.3,
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" style={{ flexShrink: 0, transition: 'transform .15s', transform: open ? 'rotate(180deg)' : undefined }}>
          <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>{open ? 'Masquer' : `Afficher les arrière-grands-parents (${count})`}</span>
      </button>
      {open && (
        <div id={listId} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {levels.map((groups, i) => ({ groups, gen: i + 3 })).reverse().map(({ groups, gen }) => (
            <Fragment key={gen}>
              <div style={{ ...MOBILE_LABEL, margin: '4px 0 0' }}>{ancestorLabel(gen)}</div>
              {groups.map(g => (
                <div
                  key={g.parents[0]?.id ?? g.childName}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    padding: 6,
                    borderRadius: 12,
                    border: '1px dashed #e0d8c6',
                    background: 'rgba(255,253,249,.6)',
                  }}
                >
                  <div style={{ fontSize: 10.5, color: '#8a8474', paddingLeft: 2 }}>Parents de {g.childName}</div>
                  {g.parents.map(p => (
                    <PersonCard key={p.id} person={p} isCenter={false} fluid onClick={() => onNav(p.id)} />
                  ))}
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

function GrandparentBlock({ side, persons, onNav }: { side: Side; persons: TreeNode[]; onNav: (id: string) => void }) {
  if (persons.length === 0) return <div />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <span style={{ ...SIDE_LABEL, fontSize: 9.5, letterSpacing: '.1em', padding: '3px 10px', alignSelf: 'flex-start' }}>
        {side === 'paternal' ? 'Côté paternel' : 'Côté maternel'}
      </span>
      {persons.map(p => (
        <PersonCard key={p.id} person={p} isCenter={false} fluid onClick={() => onNav(p.id)} />
      ))}
    </div>
  );
}

function readOpenState(key: string): Record<Side, boolean> {
  try {
    const raw = sessionStorage.getItem(key);
    if (raw) {
      const v = JSON.parse(raw) as Partial<Record<Side, unknown>>;
      return { paternal: v.paternal === true, maternal: v.maternal === true };
    }
  } catch {}
  return { paternal: false, maternal: false };
}

function MobileTree({ family, onNav }: { family: FamilyView; onNav: (id: string) => void }) {
  const { focusNode, parents, paternal, maternal, spouses, siblings, descendantLevels } = family;
  const storageKey = `geo-tree-vertical-open:${focusNode.id}`;
  const [open, setOpen] = useState(() => readOpenState(storageKey));
  const toggle = (side: Side) => {
    const next = { ...open, [side]: !open[side] };
    setOpen(next);
    try { sessionStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
  };

  const grandPaternal = paternal[0]?.flatMap(g => g.parents) ?? [];
  const grandMaternal = maternal[0]?.flatMap(g => g.parents) ?? [];
  const olderPaternal = paternal.slice(1);
  const olderMaternal = maternal.slice(1);
  const hasOlder = olderPaternal.length > 0 || olderMaternal.length > 0;
  const hasGrand = grandPaternal.length + grandMaternal.length > 0;
  const hasParents = parents.length > 0;

  return (
    <div style={{ padding: '18px 12px 22px', display: 'flex', flexDirection: 'column' }}>
      {hasOlder && (
        <div style={{ ...TWO_COL, marginBottom: 14 }}>
          <OlderAncestors side="paternal" levels={olderPaternal} open={open.paternal} onToggle={() => toggle('paternal')} onNav={onNav} />
          <OlderAncestors side="maternal" levels={olderMaternal} open={open.maternal} onToggle={() => toggle('maternal')} onNav={onNav} />
        </div>
      )}

      {hasGrand && (
        <>
          <div style={MOBILE_LABEL}>{ancestorLabel(2)}</div>
          <div style={TWO_COL}>
            <GrandparentBlock side="paternal" persons={grandPaternal} onNav={onNav} />
            <GrandparentBlock side="maternal" persons={grandMaternal} onNav={onNav} />
          </div>
          {hasParents && <MobileConnector />}
        </>
      )}

      {hasParents && (
        <>
          <div style={MOBILE_LABEL}>{ancestorLabel(1)}</div>
          <CardGrid persons={parents} onNav={onNav} />
          <MobileConnector />
        </>
      )}

      {!hasParents && <div style={MOBILE_LABEL}>Personne de référence</div>}
      <PersonCard person={focusNode} isCenter fluid onClick={() => onNav(focusNode.id)} />

      {spouses.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={MOBILE_LABEL}>{spouses.length > 1 ? 'Conjoints' : 'Conjoint'}</div>
          <CardGrid persons={spouses} onNav={onNav} />
        </div>
      )}

      {siblings.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ ...MOBILE_LABEL, color: '#8a8474' }}>Fratrie</div>
          <CardGrid persons={siblings} onNav={onNav} isSibling />
        </div>
      )}

      {descendantLevels.map((level, i) => (
        <Fragment key={`desc-${i + 1}`}>
          <MobileConnector />
          <div style={MOBILE_LABEL}>{descendantLabel(i + 1)}</div>
          <CardGrid persons={level} onNav={onNav} />
        </Fragment>
      ))}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────── */
export default function TreeVertical({ treeData, focusId, onFocus }: TreeVerticalProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const focusCardRef = useRef<HTMLDivElement>(null);
  const isNarrow = useIsNarrow();
  const family = useMemo(() => deriveFamily(treeData, focusId), [treeData, focusId]);

  useLayoutEffect(() => {
    const container = scrollRef.current;
    const card = focusCardRef.current;
    if (!container || !card) return;
    const c = container.getBoundingClientRect();
    const r = card.getBoundingClientRect();
    container.scrollLeft += (r.left + r.width / 2) - (c.left + c.width / 2);
  }, [family, isNarrow]);

  if (!family) {
    return (
      <div style={{ padding: 40, color: '#8a8474', textAlign: 'center' }}>
        Personne introuvable
      </div>
    );
  }

  const { nodeMap, focusNode, parents, paternal, maternal, spouses, siblings, descendantLevels } = family;

  const nav = (id: string) => {
    if (onFocus) {
      onFocus(id, nodeMap.get(id)?.displayName);
    } else {
      router.push(`/person/${encodeURIComponent(id)}`);
    }
  };

  if (isNarrow) return <MobileTree key={focusNode.id} family={family} onNav={nav} />;

  const centerIds = new Set([focusNode.id]);
  const focusRow: TreeNode[] = [focusNode, ...spouses];
  const upperGens = Math.max(paternal.length, maternal.length);
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
        {/* Sides share equal widths and hug the centre line so every generation stays above the parents */}
        {upperGens > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', columnGap: 24, alignItems: 'start' }}>
            <span style={{ ...SIDE_LABEL, gridRow: 1, gridColumn: 1, justifySelf: 'end', visibility: paternal.length ? 'visible' : 'hidden' }}>Côté paternel</span>
            <div style={{ gridRow: `1 / span ${upperGens * 2 + 1}`, gridColumn: 2, background: '#e0d8c6', alignSelf: 'stretch' }} />
            <span style={{ ...SIDE_LABEL, gridRow: 1, gridColumn: 3, justifySelf: 'start', visibility: maternal.length ? 'visible' : 'hidden' }}>Côté maternel</span>
            {Array.from({ length: upperGens }, (_, i) => {
              const idx = upperGens - 1 - i;
              const gen = idx + 2;
              const row = 2 + i * 2;
              return (
                <Fragment key={`anc-${gen}`}>
                  <div style={{ ...GEN_LABEL, gridRow: row, gridColumn: 1, textAlign: 'right', paddingRight: 12 }}>{paternal[idx] ? ancestorLabel(gen) : ''}</div>
                  <div style={{ ...GEN_LABEL, gridRow: row, gridColumn: 3, textAlign: 'left', paddingLeft: 12 }}>{maternal[idx] ? ancestorLabel(gen) : ''}</div>
                  <div style={{ gridRow: row + 1, gridColumn: 1 }}>
                    {paternal[idx] && <GroupRow groups={paternal[idx]} centerIds={centerIds} onNav={nav} justify="flex-end" />}
                  </div>
                  <div style={{ gridRow: row + 1, gridColumn: 3 }}>
                    {maternal[idx] && <GroupRow groups={maternal[idx]} centerIds={centerIds} onNav={nav} justify="flex-start" />}
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

              <div style={{ width: 1, height: 56, background: '#ddd5c2', flexShrink: 0 }} />

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
