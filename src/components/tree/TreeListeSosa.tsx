'use client';

import { useRouter } from 'next/navigation';
import type { TreeData } from '@/lib/types';
import { useAncestorLayout } from './useAncestorLayout';

interface TreeListeSosaProps {
  treeData: TreeData;
}

/* ── Generation label ────────────────────────────────────────── */
const GEN_LABELS: Record<number, string> = {
  0: 'Personne de référence',
  1: 'Parents',
  2: 'Grands-parents',
  3: 'Arrière-grands-parents',
  4: 'Arrière-arrière-grands-parents',
};

function genLabel(gen: number): string {
  return GEN_LABELS[gen] ?? `Génération ${gen + 1}`;
}

/* ── Badge color palette (alternating by generation) ────────── */
const GEN_BADGE_COLORS: Array<{ bg: string; color: string }> = [
  { bg: '#1e3a2f', color: '#f1ede2' },  // 0 — vert foncé (focus)
  { bg: '#dde7f1', color: '#3f617f' },  // 1 — bleu acier
  { bg: '#eef2ec', color: '#2f5142' },  // 2 — vert tint
  { bg: '#f8eecf', color: '#8a6d12' },  // 3 — doré/ambre
  { bg: '#dde7f1', color: '#3f617f' },  // 4 — bleu acier
];

function badgeColors(gen: number) {
  return GEN_BADGE_COLORS[gen % GEN_BADGE_COLORS.length];
}

/* ── Main component ─────────────────────────────────────────── */
export default function TreeListeSosa({ treeData }: TreeListeSosaProps) {
  const router = useRouter();
  const ancestors = useAncestorLayout(treeData);

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e9e2d2',
        borderRadius: 20,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 22px',
          borderBottom: '1px solid #e9e2d2',
          background: '#faf8f3',
        }}
      >
        <p style={{ fontSize: 14, color: '#8a8474', margin: 0, lineHeight: 1.5 }}>
          Numérotation Sosa-Stradonitz — n° 1 = personne de référence, père = 2n, mère = 2n+1
        </p>
      </div>

      {/* List */}
      <div>
        {ancestors.map((ancestor, i) => {
          const isLast = i === ancestors.length - 1;
          const badge  = badgeColors(ancestor.gen);

          const meta = [
            ancestor.birthYear && ancestor.deathYear
              ? `${ancestor.birthYear} – ${ancestor.deathYear}`
              : ancestor.birthYear
              ? `${ancestor.birthYear}`
              : ancestor.deathYear
              ? `† ${ancestor.deathYear}`
              : null,
          ]
            .filter(Boolean)
            .join(' · ');

          return (
            <button
              key={ancestor.id}
              onClick={() => router.push(`/person/${ancestor.id}`)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '12px 22px',
                background: 'transparent',
                border: 'none',
                borderBottom: isLast ? 'none' : '1px solid #f2ede3',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background .12s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = '#f7f3ea';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }}
            >
              {/* Sosa badge */}
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: badge.bg,
                  color: badge.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  flexShrink: 0,
                  letterSpacing: ancestor.ahnen >= 100 ? '-.02em' : 0,
                }}
              >
                {ancestor.ahnen}
              </div>

              {/* Name & dates */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#1c1f1c',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {ancestor.displayName}
                </div>
                {meta && (
                  <div style={{
                    fontSize: 12,
                    color: '#8a8474',
                    marginTop: 2,
                  }}>
                    {meta}
                  </div>
                )}
              </div>

              {/* Generation label */}
              <div style={{
                fontSize: 11.5,
                color: '#9a9080',
                flexShrink: 0,
                textAlign: 'right',
                maxWidth: 180,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {genLabel(ancestor.gen)}
              </div>

              {/* Chevron */}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#c9c0b0"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0 }}
              >
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          );
        })}

        {ancestors.length === 0 && (
          <div style={{ padding: '40px 22px', color: '#8a8474', textAlign: 'center' }}>
            Aucun ancêtre trouvé
          </div>
        )}
      </div>
    </div>
  );
}
