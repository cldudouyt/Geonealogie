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

export function useIsNarrow(): boolean {
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

interface CardSize { w: number; h: number; font: number; meta: number; pad: string }

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
  size,
}: {
  person: TreeNode;
  isCenter: boolean;
  isSibling?: boolean;
  onClick: () => void;
  anchorRef?: React.Ref<HTMLDivElement>;
  fluid?: boolean;
  size?: CardSize;
}) {
  const w = isCenter ? CARD_W_CENTRAL : CARD_W_NORMAL;
  const s = person.sex ?? 'U';
  const nameColor = isCenter ? '#f4efe3' : '#1c1f1c';
  const metaColor = isCenter ? '#9fb0a1' : '#8a8474';
  const inlineAdopted = (fluid || !!size) && person.isAdopted && !isCenter;

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
        width: size ? size.w : fluid ? '100%' : isSibling ? 148 : w,
        minWidth: 0,
        minHeight: fluid ? 48 : undefined,
        height: size?.h,
        boxSizing: 'border-box',
        borderRadius: 13,
        padding: size ? size.pad : fluid ? (isCenter ? '12px 14px' : '9px 10px') : isSibling ? 10 : 13,
        ...(size ? { display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' } : {}),
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
      {person.isAdopted && !isCenter && !fluid && !size && (
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
        fontSize: size ? size.font : fluid ? (isCenter ? 14.5 : 12.5) : isSibling ? 12.5 : 13.5,
        fontWeight: 700,
        color: nameColor,
        margin: 0,
        lineHeight: 1.3,
        overflow: 'hidden',
        paddingRight: isCenter ? 52 : 0,
        ...(fluid || size
          ? { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflowWrap: 'anywhere' }
          : { textOverflow: 'ellipsis', whiteSpace: 'nowrap' }),
      }}>
        {renderName(person.displayName, isCenter)}
      </p>

      {(meta || inlineAdopted) && (
        <p style={{
          fontSize: size ? size.meta : isSibling ? 11 : 11.5,
          color: metaColor,
          margin: '4px 0 0',
          lineHeight: 1.3,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          display: fluid || size ? 'flex' : undefined,
          alignItems: 'center',
          gap: 6,
        }}>
          {meta}
          {inlineAdopted && (
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
  upParents: Map<string, TreeNode[]>;
  childToParents: Map<string, string[]>;
  spouseMap: Map<string, string[]>;
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
  const upParents = new Map<string, TreeNode[]>();
  const parentsOf = (id: string): TreeNode[] => {
    const ps = sortParents(byIds((childToParents.get(id) ?? []).filter(pid => !seenUp.has(pid))));
    upParents.set(id, ps);
    return ps;
  };

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

  return { nodeMap, focusNode, parents, paternal, maternal, spouses, siblings, descendantLevels, upParents, childToParents, spouseMap };
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

const LINE = '#cdbf9f';
type Col = 'L' | 'C' | 'R';
const COL_X: Record<Col, string> = {
  L: 'calc((100% - 10px) / 4)',
  C: '50%',
  R: 'calc(100% - (100% - 10px) / 4)',
};
const COL_ORDER: Col[] = ['L', 'C', 'R'];

function Branches({
  from = [],
  to = [],
  height = 30,
  dashed,
  joined = true,
}: {
  from?: Col[];
  to?: Col[];
  height?: number;
  dashed?: boolean;
  joined?: boolean;
}) {
  const mid = Math.round(height / 2);
  const all = [...from, ...to];
  const xs = COL_ORDER.filter(c => all.includes(c));
  const stroke = dashed ? `2px dashed ${LINE}` : `2px solid ${LINE}`;
  const vertical = (x: Col, top: number, bottom: number, key: string) => (
    <div key={key} style={{ position: 'absolute', left: `calc(${COL_X[x]} - 1px)`, top, height: bottom - top, borderLeft: stroke }} />
  );
  return (
    <div aria-hidden="true" style={{ position: 'relative', height }}>
      {from.map(x => vertical(x, 0, to.length ? mid : height, `f${x}`))}
      {to.map(x => vertical(x, from.length ? mid : 0, height, `t${x}`))}
      {joined && xs.length > 1 && (
        <div style={{
          position: 'absolute',
          top: mid - 1,
          left: COL_X[xs[0]],
          width: `calc(${COL_X[xs[xs.length - 1]]} - ${COL_X[xs[0]]})`,
          borderTop: stroke,
        }} />
      )}
    </div>
  );
}

function FamilyBox({ caption, children }: { caption: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      padding: 8,
      borderRadius: 14,
      border: `1px solid #e4dac4`,
      background: 'rgba(47,81,66,.035)',
      minWidth: 0,
    }}>
      <div style={{ fontSize: 10.5, color: '#8a8474', textAlign: 'center', lineHeight: 1.3 }}>{caption}</div>
      {children}
    </div>
  );
}

function coupleNames(persons: TreeNode[]): string {
  const names = persons.map(p => firstName(p.displayName));
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}` : names[0] ?? '';
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

function GrandparentBlock({ side, group, onNav }: { side: Side; group?: CoupleGroup; onNav: (id: string) => void }) {
  if (!group) return <div />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <span style={{ ...SIDE_LABEL, fontSize: 9.5, letterSpacing: '.1em', padding: '3px 10px', alignSelf: 'center' }}>
        {side === 'paternal' ? 'Côté paternel' : 'Côté maternel'}
      </span>
      <FamilyBox caption={`Parents de ${group.childName}`}>
        {group.parents.map(p => (
          <PersonCard key={p.id} person={p} isCenter={false} fluid onClick={() => onNav(p.id)} />
        ))}
      </FamilyBox>
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

  const father = parents.find(p => p.sex === 'M') ?? parents.find(p => p.sex !== 'F');
  const mother = parents.find(p => p !== father && p.sex !== 'M');
  const otherParents = parents.filter(p => p !== father && p !== mother);
  const grandPaternal = paternal[0]?.[0];
  const grandMaternal = maternal[0]?.[0];
  const olderPaternal = paternal.slice(1);
  const olderMaternal = maternal.slice(1);
  const hasOlder = olderPaternal.length > 0 || olderMaternal.length > 0;
  const hasParents = parents.length > 0;
  const parentCols: Col[] = [...(father ? ['L' as Col] : []), ...(mother ? ['R' as Col] : [])];
  const grandDrops: Col[] = [...(grandPaternal && father ? ['L' as Col] : []), ...(grandMaternal && mother ? ['R' as Col] : [])];
  const focusFirst = firstName(focusNode.displayName);

  return (
    <div style={{ padding: '18px 12px 22px', display: 'flex', flexDirection: 'column' }}>
      {hasOlder && (
        <div style={{ ...TWO_COL, marginBottom: 14 }}>
          <OlderAncestors side="paternal" levels={olderPaternal} open={open.paternal} onToggle={() => toggle('paternal')} onNav={onNav} />
          <OlderAncestors side="maternal" levels={olderMaternal} open={open.maternal} onToggle={() => toggle('maternal')} onNav={onNav} />
        </div>
      )}

      {(grandPaternal || grandMaternal) && (
        <>
          <div style={MOBILE_LABEL}>{ancestorLabel(2)}</div>
          <div style={TWO_COL}>
            <GrandparentBlock side="paternal" group={grandPaternal} onNav={onNav} />
            <GrandparentBlock side="maternal" group={grandMaternal} onNav={onNav} />
          </div>
          {grandDrops.length > 0 && <Branches from={grandDrops} to={grandDrops} height={22} joined={false} />}
        </>
      )}

      {hasParents && (
        <>
          {!(grandPaternal || grandMaternal) && <div style={MOBILE_LABEL}>{ancestorLabel(1)}</div>}
          <div style={TWO_COL}>
            {father ? <PersonCard person={father} isCenter={false} fluid onClick={() => onNav(father.id)} /> : <div />}
            {mother ? <PersonCard person={mother} isCenter={false} fluid onClick={() => onNav(mother.id)} /> : <div />}
            {otherParents.map(p => <PersonCard key={p.id} person={p} isCenter={false} fluid onClick={() => onNav(p.id)} />)}
          </div>
          <Branches from={parentCols.length ? parentCols : ['L']} to={['C']} />
        </>
      )}

      {!hasParents && <div style={MOBILE_LABEL}>Personne de référence</div>}

      {siblings.length > 0 ? (
        <FamilyBox caption={`Enfants de ${coupleNames(parents)}`}>
          <PersonCard person={focusNode} isCenter fluid onClick={() => onNav(focusNode.id)} />
          <CardGrid persons={siblings} onNav={onNav} isSibling />
        </FamilyBox>
      ) : (
        <PersonCard person={focusNode} isCenter fluid onClick={() => onNav(focusNode.id)} />
      )}

      {spouses.length > 0 && (
        <>
          <Branches from={['C']} to={['C']} height={18} dashed />
          <div style={{ ...MOBILE_LABEL, margin: '0 0 8px' }}>{spouses.length > 1 ? 'Conjoints' : 'Conjoint'} de {focusFirst}</div>
          {spouses.length === 1 ? (
            <div style={{ width: 'calc(50% - 5px)', margin: '0 auto' }}>
              <PersonCard person={spouses[0]} isCenter={false} fluid onClick={() => onNav(spouses[0].id)} />
            </div>
          ) : (
            <CardGrid persons={spouses} onNav={onNav} />
          )}
        </>
      )}

      {descendantLevels.map((level, i) => (
        <Fragment key={`desc-${i + 1}`}>
          <Branches from={['C']} to={['C']} height={22} />
          <FamilyBox caption={i === 0 ? `${descendantLabel(1)} de ${coupleNames(spouses.length === 1 ? [focusNode, spouses[0]] : [focusNode])}` : descendantLabel(i + 1)}>
            <CardGrid persons={level} onNav={onNav} />
          </FamilyBox>
        </Fragment>
      ))}
    </div>
  );
}

/* ── Desktop pedigree ───────────────────────────────────────── */
const FOCUS_SIZE: CardSize = { w: 208, h: 88, font: 14.5, meta: 11.5, pad: '12px 14px' };
const KIN_SIZE: CardSize = { w: 180, h: 80, font: 13, meta: 11, pad: '10px 12px' };
const GEN_SIZES: CardSize[] = [
  FOCUS_SIZE,
  { w: 200, h: 84, font: 13.5, meta: 11.5, pad: '11px 13px' },
  { w: 170, h: 80, font: 13, meta: 11, pad: '10px 12px' },
  { w: 150, h: 76, font: 12.5, meta: 11, pad: '9px 11px' },
  { w: 140, h: 74, font: 12, meta: 10.5, pad: '9px 10px' },
];
const genSize = (gen: number) => GEN_SIZES[Math.min(gen, GEN_SIZES.length - 1)];

const V_GAP = 52;
const COUPLE_GAP = 28;
const BRANCH_GAP = 40;
const BOX_PAD = 10;
const CAPTION_H = 16;
const CAPTION_GAP = 8;
const CARD_GAP = 14;
const ROW_MAX = 5;
const SPOUSE_GAP = 56;
const EDGE = 24;
const GUTTER = 132;
const TAG_H = 22;
const TAG_W = 130;

type Pt = [number, number];
type CardKind = 'focus' | 'kin' | 'sibling' | 'stub';
interface DeskCard { person: TreeNode; x: number; y: number; size: CardSize; kind: CardKind }
interface DeskBox { x: number; y: number; w: number; h: number; caption: string; captionW: number; align: 'left' | 'center' }
interface DeskLine { pts: Pt[]; dashed?: boolean }
interface DeskText { x: number; y: number; text: string; w: number }
interface DeskLayout {
  width: number;
  height: number;
  cards: DeskCard[];
  boxes: DeskBox[];
  lines: DeskLine[];
  notes: DeskText[];
  tags: DeskText[];
  rowLabels: { y: number; text: string }[];
}

interface ANode {
  person: TreeNode;
  gen: number;
  stub: boolean;
  parents: ANode[];
  block: number;
  width: number;
  left: number;
  x: number;
}

function buildAncestors({ nodeMap, focusNode, upParents, childToParents }: FamilyView): ANode {
  const displayed = new Set([...upParents.values()].flat().map(p => p.id));
  const build = (person: TreeNode, gen: number, stub: boolean): ANode => {
    const shown = stub ? [] : upParents.get(person.id) ?? [];
    const shownIds = new Set(shown.map(p => p.id));
    const collapsed = stub
      ? []
      : [...new Set(childToParents.get(person.id) ?? [])]
          .filter(id => !shownIds.has(id) && displayed.has(id))
          .map(id => nodeMap.get(id))
          .filter((p): p is TreeNode => Boolean(p));
    const parents = sortParents([...shown, ...collapsed]).map(p => build(p, gen + 1, !shownIds.has(p.id)));
    return { person, gen, stub, parents, block: 0, width: 0, left: 0, x: 0 };
  };
  return build(focusNode, 0, false);
}

const branchGap = (a: ANode, b: ANode) => (a.parents.length || b.parents.length ? BRANCH_GAP : COUPLE_GAP);

function measure(n: ANode) {
  n.parents.forEach(measure);
  n.block = n.parents.reduce((sum, p, i) => sum + p.width + (i ? branchGap(n.parents[i - 1], p) : 0), 0);
  n.width = Math.max(genSize(n.gen).w, n.block);
}

function place(n: ANode, left: number) {
  n.left = left;
  if (n.parents.length === 0) {
    n.x = left + n.width / 2;
    return;
  }
  let cursor = left + (n.width - n.block) / 2;
  n.parents.forEach((p, i) => {
    if (i) cursor += branchGap(n.parents[i - 1], p);
    place(p, cursor);
    cursor += p.width;
  });
  const half = genSize(n.gen).w / 2;
  const mid = (n.parents[0].x + n.parents[n.parents.length - 1].x) / 2;
  n.x = Math.min(Math.max(mid, left + half), left + n.width - half);
}

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

const rowWidth = (n: number, size: CardSize = KIN_SIZE) => n * size.w + Math.max(0, n - 1) * CARD_GAP;
const captionWidth = (text: string) => Math.ceil(text.length * 6) + 8;

function drop(from: Pt, to: Pt, elbowY: number): Pt[] {
  if (Math.abs(from[0] - to[0]) < 1) return [from, [from[0], to[1]]];
  return [from, [from[0], elbowY], [to[0], elbowY], to];
}

function layoutDesktop(family: FamilyView): DeskLayout {
  const { nodeMap, focusNode, parents, siblings, spouses, descendantLevels, childToParents, spouseMap } = family;
  const cards: DeskCard[] = [];
  const boxes: DeskBox[] = [];
  const lines: DeskLine[] = [];
  const notes: DeskText[] = [];
  const tags: DeskText[] = [];
  const rowLabels: { y: number; text: string }[] = [];

  const root = buildAncestors(family);
  measure(root);
  place(root, 0);
  const all: ANode[] = [];
  const walk = (n: ANode) => { all.push(n); n.parents.forEach(walk); };
  walk(root);
  const maxGen = Math.max(...all.map(n => n.gen));
  const topGen = (n: ANode): number => Math.max(n.gen, ...n.parents.map(topGen));

  const sideRoots = root.parents.filter(p => !p.stub && p.parents.length > 0 && p.person.sex !== 'U');
  let y = sideRoots.length ? TAG_H + 18 : 8;
  const rowY: number[] = [];
  for (let g = maxGen; g >= 1; g--) {
    rowY[g] = y;
    rowLabels.push({ y: y + genSize(g).h / 2, text: ancestorLabel(g) });
    y += genSize(g).h + V_GAP;
  }
  const rowTop = y;

  for (const p of sideRoots) {
    tags.push({
      x: p.left + p.width / 2 - TAG_W / 2,
      y: rowY[topGen(p)] - TAG_H - 8,
      w: TAG_W,
      text: p.person.sex === 'M' ? 'Côté paternel' : 'Côté maternel',
    });
  }

  for (const n of all) {
    if (n.gen === 0) continue;
    const size = genSize(n.gen);
    cards.push({ person: n.person, x: n.x - size.w / 2, y: rowY[n.gen], size, kind: n.stub ? 'stub' : 'kin' });
  }

  const focusX = root.x;
  let focusY = rowTop;
  let blockBottom: number;
  if (siblings.length > 0) {
    const first = siblings.slice(0, ROW_MAX - 1);
    const rest = chunk(siblings.slice(ROW_MAX - 1), ROW_MAX - 1);
    const row1W = first.length * (KIN_SIZE.w + CARD_GAP) + FOCUS_SIZE.w;
    const boxX = focusX + FOCUS_SIZE.w / 2 - row1W - BOX_PAD;
    focusY = rowTop + BOX_PAD + CAPTION_H + CAPTION_GAP;
    first.forEach((p, i) => cards.push({
      person: p,
      x: boxX + BOX_PAD + i * (KIN_SIZE.w + CARD_GAP),
      y: focusY + (FOCUS_SIZE.h - KIN_SIZE.h) / 2,
      size: KIN_SIZE,
      kind: 'sibling',
    }));
    let ry = focusY + FOCUS_SIZE.h + CARD_GAP;
    for (const row of rest) {
      row.forEach((p, i) => cards.push({ person: p, x: boxX + BOX_PAD + i * (KIN_SIZE.w + CARD_GAP), y: ry, size: KIN_SIZE, kind: 'sibling' }));
      ry += KIN_SIZE.h + CARD_GAP;
    }
    const boxH = ry - CARD_GAP + BOX_PAD - rowTop;
    boxes.push({
      x: boxX,
      y: rowTop,
      w: row1W + 2 * BOX_PAD,
      h: boxH,
      caption: `Enfants de ${coupleNames(parents)}`,
      captionW: row1W - FOCUS_SIZE.w / 2 - 12,
      align: 'left',
    });
    blockBottom = rowTop + boxH;
  } else {
    blockBottom = focusY + FOCUS_SIZE.h;
  }
  cards.push({ person: focusNode, x: focusX - FOCUS_SIZE.w / 2, y: focusY, size: FOCUS_SIZE, kind: 'focus' });
  rowLabels.push({ y: focusY + FOCUS_SIZE.h / 2, text: 'Personne de référence' });

  for (const n of all) {
    if (n.stub || n.parents.length === 0) continue;
    const ps = genSize(n.gen + 1);
    const py = rowY[n.gen + 1];
    const childTop = n.gen === 0 ? focusY : rowY[n.gen];
    const elbowY = py + ps.h + V_GAP / 2;
    let start: Pt;
    if (n.parents.length > 1) {
      const barY = py + ps.h / 2;
      for (let i = 1; i < n.parents.length; i++) {
        lines.push({ pts: [[n.parents[i - 1].x + ps.w / 2, barY], [n.parents[i].x - ps.w / 2, barY]] });
      }
      const mid = (n.parents[0].x + n.parents[n.parents.length - 1].x) / 2;
      const inside = n.parents.find(p => Math.abs(p.x - mid) < ps.w / 2);
      start = inside ? [inside.x, py + ps.h] : [mid, barY];
    } else {
      start = [n.parents[0].x, py + ps.h];
    }
    lines.push({ pts: drop(start, [n.x, childTop], elbowY) });
  }

  const focusFirst = firstName(focusNode.displayName);
  const midY = focusY + FOCUS_SIZE.h / 2;
  let edge = focusX + FOCUS_SIZE.w / 2;
  for (const sp of spouses) {
    const left = edge + SPOUSE_GAP;
    const cy = focusY + (FOCUS_SIZE.h - KIN_SIZE.h) / 2;
    lines.push({ pts: [[edge, midY], [left, midY]], dashed: true });
    cards.push({ person: sp, x: left, y: cy, size: KIN_SIZE, kind: 'kin' });
    notes.push({ x: left, y: cy - 20, w: KIN_SIZE.w, text: `Conjoint de ${focusFirst}` });
    edge = left + KIN_SIZE.w;
    blockBottom = Math.max(blockBottom, cy + KIN_SIZE.h);
  }

  const parentOf = new Map<string, string>();
  descendantLevels.forEach((level, i) => {
    if (i === 0) return;
    const prevIds = new Set(descendantLevels[i - 1].map(p => p.id));
    for (const c of level) {
      const pid = (childToParents.get(c.id) ?? []).find(id => prevIds.has(id)) ?? descendantLevels[i - 1][0].id;
      parentOf.set(c.id, pid);
    }
  });
  const hasKids = new Set(parentOf.values());
  const withSpouse = (p: TreeNode): TreeNode[] => {
    const sps = [...new Set(spouseMap.get(p.id) ?? [])].map(id => nodeMap.get(id)).filter((n): n is TreeNode => Boolean(n));
    return sps.length === 1 ? [p, sps[0]] : [p];
  };

  interface Group { anchor: Pt; caption: string; members: TreeNode[] }
  let prevCards = new Map<string, DeskCard>();
  let levelTop = blockBottom + V_GAP;
  descendantLevels.forEach((level, i) => {
    let groups: Group[];
    if (i === 0) {
      const anchor: Pt = spouses.length
        ? [focusX + FOCUS_SIZE.w / 2 + SPOUSE_GAP / 2, midY]
        : [focusX, focusY + FOCUS_SIZE.h];
      const couple = spouses.length === 1 ? [focusNode, spouses[0]] : [focusNode];
      groups = [{ anchor, caption: `${descendantLabel(1)} de ${coupleNames(couple)}`, members: level }];
    } else {
      const byParent = new Map<string, TreeNode[]>();
      for (const c of level) {
        const pid = parentOf.get(c.id)!;
        byParent.set(pid, [...(byParent.get(pid) ?? []), c]);
      }
      groups = [...byParent.entries()].map(([pid, members]) => {
        const pc = prevCards.get(pid)!;
        return {
          anchor: [pc.x + pc.size.w / 2, pc.y + pc.size.h] as Pt,
          caption: `Enfants de ${coupleNames(withSpouse(pc.person))}`,
          members,
        };
      });
      groups.sort((a, b) => a.anchor[0] - b.anchor[0]);
    }

    const sized = groups.map(g => {
      const perRow = g.members.some(m => hasKids.has(m.id)) ? g.members.length : Math.min(ROW_MAX, g.members.length);
      const rows = chunk(g.members, perRow);
      const inner = Math.max(rowWidth(perRow), captionWidth(g.caption));
      const h = 2 * BOX_PAD + CAPTION_H + CAPTION_GAP + rows.length * KIN_SIZE.h + (rows.length - 1) * CARD_GAP;
      return { ...g, rows, inner, w: inner + 2 * BOX_PAD, h };
    });
    let cursor = -Infinity;
    const lefts = sized.map(g => {
      const l = Math.max(g.anchor[0] - g.w / 2, cursor + BRANCH_GAP);
      cursor = l + g.w;
      return l;
    });
    const disp = lefts.map((l, k) => l + sized[k].w / 2 - sized[k].anchor[0]);
    const shift = -(Math.max(...disp) + Math.min(...disp)) / 2;

    const nextCards = new Map<string, DeskCard>();
    let bottom = levelTop;
    let elbowIdx = 0;
    sized.forEach((g, k) => {
      const bx = lefts[k] + shift;
      boxes.push({ x: bx, y: levelTop, w: g.w, h: g.h, caption: g.caption, captionW: g.inner, align: 'center' });
      let ry = levelTop + BOX_PAD + CAPTION_H + CAPTION_GAP;
      for (const row of g.rows) {
        const rx = bx + BOX_PAD + (g.inner - rowWidth(row.length)) / 2;
        row.forEach((p, j) => {
          const card: DeskCard = { person: p, x: rx + j * (KIN_SIZE.w + CARD_GAP), y: ry, size: KIN_SIZE, kind: 'kin' };
          cards.push(card);
          nextCards.set(p.id, card);
        });
        ry += KIN_SIZE.h + CARD_GAP;
      }
      const cx = bx + g.w / 2;
      const straight = Math.abs(cx - g.anchor[0]) < 1;
      const elbowY = levelTop - V_GAP / 2 + (straight ? 0 : ((elbowIdx++ % 5) - 2) * 6);
      lines.push({ pts: drop(g.anchor, [cx, levelTop], elbowY) });
      bottom = Math.max(bottom, levelTop + g.h);
    });
    rowLabels.push({ y: levelTop + BOX_PAD + CAPTION_H + CAPTION_GAP + KIN_SIZE.h / 2, text: descendantLabel(i + 1) });
    prevCards = nextCards;
    levelTop = bottom + V_GAP;
  });

  const xs = [
    ...cards.flatMap(c => [c.x, c.x + c.size.w]),
    ...boxes.flatMap(b => [b.x, b.x + b.w]),
    ...[...notes, ...tags].flatMap(t => [t.x, t.x + t.w]),
  ];
  const minX = Math.min(...xs);
  const dx = EDGE - minX;
  const r = (v: number) => Math.round(v);
  const bottoms = [...cards.map(c => c.y + c.size.h), ...boxes.map(b => b.y + b.h)];
  return {
    width: r(Math.max(...xs) - minX + 2 * EDGE),
    height: r(Math.max(...bottoms) + EDGE),
    cards: cards.map(c => ({ ...c, x: r(c.x + dx), y: r(c.y) })),
    boxes: boxes.map(b => ({ ...b, x: r(b.x + dx), y: r(b.y), w: r(b.w), h: r(b.h) })),
    lines: lines.map(l => ({ ...l, pts: l.pts.map(([px, py]) => [r(px + dx), r(py)] as Pt) })),
    notes: notes.map(t => ({ ...t, x: r(t.x + dx), y: r(t.y) })),
    tags: tags.map(t => ({ ...t, x: r(t.x + dx), y: r(t.y) })),
    rowLabels: rowLabels.map(l => ({ ...l, y: r(l.y) })),
  };
}

function StubCard({ person, size, onClick }: { person: TreeNode; size: CardSize; onClick: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${person.displayName}, déjà présent dans l'arbre : centrer sur cette personne`}
      title={`${person.displayName} apparaît déjà dans l'arbre`}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      onClick={onClick}
      style={{
        width: size.w,
        height: size.h,
        boxSizing: 'border-box',
        padding: size.pad,
        borderRadius: 13,
        border: `1.5px dashed ${LINE}`,
        background: '#fffdf9',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        cursor: 'pointer',
        overflow: 'hidden',
      }}
    >
      <p style={{ margin: 0, fontSize: size.font - 0.5, fontWeight: 600, color: '#5d5a50', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflowWrap: 'anywhere' }}>
        {person.displayName}
      </p>
      <p style={{ margin: '4px 0 0', fontSize: 10.5, color: '#9a8c74', lineHeight: 1.3 }}>↑ Déjà dans l&apos;arbre</p>
    </div>
  );
}

const NOTE_STYLE: React.CSSProperties = {
  position: 'absolute',
  height: CAPTION_H,
  fontSize: 10.5,
  lineHeight: `${CAPTION_H}px`,
  color: '#8a8474',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

function DesktopTree({
  layout,
  onNav,
  focusRef,
}: {
  layout: DeskLayout;
  onNav: (id: string) => void;
  focusRef: React.Ref<HTMLDivElement>;
}) {
  const { width, height, cards, boxes, lines, notes, tags } = layout;
  return (
    <div style={{ position: 'relative', width, height, flexShrink: 0, margin: '0 auto' }}>
      {boxes.map((b, i) => (
        <div
          key={`box-${i}`}
          style={{
            position: 'absolute',
            left: b.x,
            top: b.y,
            width: b.w,
            height: b.h,
            boxSizing: 'border-box',
            borderRadius: 14,
            border: '1px solid #e4dac4',
            background: 'rgba(47,81,66,.035)',
          }}
        >
          <div style={{ ...NOTE_STYLE, top: BOX_PAD - 1, left: BOX_PAD - 1, width: b.captionW, textAlign: b.align }} title={b.caption}>
            {b.caption}
          </div>
        </div>
      ))}
      <svg aria-hidden="true" width={width} height={height} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {lines.map((l, i) => (
          <polyline
            key={i}
            points={l.pts.map(p => p.join(',')).join(' ')}
            fill="none"
            stroke={LINE}
            strokeWidth={2}
            strokeDasharray={l.dashed ? '6 5' : undefined}
            strokeLinejoin="round"
          />
        ))}
      </svg>
      {tags.map(t => (
        <span
          key={t.text}
          style={{
            ...SIDE_LABEL,
            position: 'absolute',
            left: t.x,
            top: t.y,
            width: t.w,
            height: TAG_H,
            boxSizing: 'border-box',
            lineHeight: `${TAG_H - 6}px`,
            textAlign: 'center',
            whiteSpace: 'nowrap',
          }}
        >
          {t.text}
        </span>
      ))}
      {notes.map((t, i) => (
        <div key={`note-${i}`} style={{ ...NOTE_STYLE, left: t.x, top: t.y, width: t.w }}>{t.text}</div>
      ))}
      {cards.map((c, i) => (
        <div key={`${c.kind}-${c.person.id}-${i}`} style={{ position: 'absolute', left: c.x, top: c.y, zIndex: c.kind === 'focus' ? 2 : 1 }}>
          {c.kind === 'stub' ? (
            <StubCard person={c.person} size={c.size} onClick={() => onNav(c.person.id)} />
          ) : (
            <PersonCard
              person={c.person}
              isCenter={c.kind === 'focus'}
              isSibling={c.kind === 'sibling'}
              size={c.size}
              onClick={() => onNav(c.person.id)}
              anchorRef={c.kind === 'focus' ? focusRef : undefined}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function RowLabels({ layout, scrolled }: { layout: DeskLayout; scrolled: boolean }) {
  return (
    <div style={{
      position: 'sticky',
      left: 0,
      zIndex: 3,
      width: GUTTER,
      height: layout.height,
      flexShrink: 0,
      pointerEvents: 'none',
      background: scrolled ? 'linear-gradient(90deg, #fbf9f3 84%, rgba(251,249,243,0))' : undefined,
      transition: 'background .2s',
    }}>
      {layout.rowLabels.map(l => (
        <div
          key={`${l.text}-${l.y}`}
          style={{
            position: 'absolute',
            top: l.y,
            left: 20,
            right: 8,
            transform: 'translateY(-50%)',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '.1em',
            lineHeight: 1.35,
            textTransform: 'uppercase',
            color: '#8a8474',
          }}
        >
          {l.text}
        </div>
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
  const [scrolled, setScrolled] = useState(false);
  const family = useMemo(() => deriveFamily(treeData, focusId), [treeData, focusId]);
  const layout = useMemo(() => (family && !isNarrow ? layoutDesktop(family) : null), [family, isNarrow]);

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

  const nav = (id: string) => {
    if (onFocus) {
      onFocus(id, family.nodeMap.get(id)?.displayName);
    } else {
      router.push(`/person/${encodeURIComponent(id)}`);
    }
  };

  if (isNarrow || !layout) return <MobileTree key={family.focusNode.id} family={family} onNav={nav} />;

  return (
    <div
      ref={scrollRef}
      onScroll={e => setScrolled(e.currentTarget.scrollLeft > 4)}
      style={{ overflowX: 'auto', padding: '28px 0 12px' }}
    >
      <div style={{ display: 'flex', width: 'max-content', minWidth: '100%', paddingRight: GUTTER / 2, boxSizing: 'border-box' }}>
        <RowLabels layout={layout} scrolled={scrolled} />
        <DesktopTree layout={layout} onNav={nav} focusRef={focusCardRef} />
      </div>
    </div>
  );
}
