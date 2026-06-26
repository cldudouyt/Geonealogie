'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { TreeData } from '@/lib/types';
import { useAncestorLayout, type AncestorNode } from './useAncestorLayout';

/* ── Types ──────────────────────────────────────────────────── */
type RadialMode = 'fan' | 'wheel';

interface TreeRadialProps {
  treeData: TreeData;
  mode: RadialMode;
  onFocus?: (id: string) => void;
}

/* ── Constants ───────────────────────────────────────────────── */
const MAX_GEN   = 4;
const ROOT_R    = 38;
const RING_W    = 90;

/* ── buildRadial ─────────────────────────────────────────────── */
interface RadialSegment {
  node: AncestorNode;
  path: string;
  textX: number;
  textY: number;
  textRotate: number;
  label: string;
  fill: string;
  stroke: string;
}

function polarToXY(r: number, angle: number): { x: number; y: number } {
  return { x: r * Math.sin(angle), y: -r * Math.cos(angle) };
}

function arcPath(
  inner: number,
  outer: number,
  startAngle: number,
  endAngle: number,
  pad: number = 0.012,
): string {
  const a0 = startAngle + pad / 2;
  const a1 = endAngle  - pad / 2;
  const p0i = polarToXY(inner, a0);
  const p1i = polarToXY(inner, a1);
  const p0o = polarToXY(outer, a0);
  const p1o = polarToXY(outer, a1);
  const sweep = a1 - a0 > Math.PI ? 1 : 0;
  return [
    `M ${p0o.x} ${p0o.y}`,
    `A ${outer} ${outer} 0 ${sweep} 1 ${p1o.x} ${p1o.y}`,
    `L ${p1i.x} ${p1i.y}`,
    `A ${inner} ${inner} 0 ${sweep} 0 ${p0i.x} ${p0i.y}`,
    'Z',
  ].join(' ');
}

function buildRadial(
  ancestors: AncestorNode[],
  mode: RadialMode,
): RadialSegment[] {
  const a0 = mode === 'fan' ? Math.PI  : -Math.PI / 2;  // fan: bottom half reversed => top half
  const a1 = mode === 'fan' ? 2 * Math.PI : (3 * Math.PI) / 2;
  const span = a1 - a0;

  return ancestors
    .filter(a => a.gen > 0 && a.gen <= MAX_GEN)
    .map(a => {
      const count = Math.pow(2, a.gen);
      const startAngle = a0 + (a.posInGen / count) * span;
      const endAngle   = a0 + ((a.posInGen + 1) / count) * span;
      const midAngle   = (startAngle + endAngle) / 2;

      const inner = ROOT_R + 6 + (a.gen - 1) * RING_W;
      const outer = ROOT_R + 6 + a.gen * RING_W - 2;
      const midR  = (inner + outer) / 2;

      const path = arcPath(inner, outer, startAngle, endAngle);
      const mid  = polarToXY(midR, midAngle);

      // Rotate text tangent to arc, flip on left hemisphere to stay readable
      let textRotate = (midAngle * 180) / Math.PI;
      if (textRotate > 90 || textRotate < -90) textRotate += 180;

      // Label visibility
      const arcDeg = ((endAngle - startAngle) * 180) / Math.PI;
      const showFull  = arcDeg > 22 && a.gen <= 3;
      const showShort = arcDeg > 9  && a.gen <= MAX_GEN;
      let label = '';
      if (showFull) {
        label = a.displayName;
      } else if (showShort) {
        const parts = a.displayName.trim().split(' ');
        label = parts[parts.length - 1];
      }

      // Colors per spec: males #dde7f1 / #9bb4cd, females #f3e1de / #d3a8a1
      const isMale = a.sex === 'M';
      const fill   = isMale ? '#dde7f1' : '#f3e1de';
      const stroke = isMale ? '#9bb4cd' : '#d3a8a1';

      return {
        node: a,
        path,
        textX: mid.x,
        textY: mid.y,
        textRotate,
        label: label.length > 14 ? label.slice(0, 13) + '…' : label,
        fill,
        stroke,
      };
    });
}

/* ── SVG dimensions per mode ─────────────────────────────────── */
function getViewBox(mode: RadialMode): string {
  // Total radius for MAX_GEN rings
  const totalR = ROOT_R + 6 + MAX_GEN * RING_W + 10;
  if (mode === 'fan') {
    // demi-cercle supérieur, pivot en bas
    return `${-totalR} ${-totalR} ${totalR * 2} ${totalR + 20}`;
  }
  // roue complète
  return `${-totalR} ${-totalR} ${totalR * 2} ${totalR * 2}`;
}

/* ── Main component ─────────────────────────────────────────── */
export default function TreeRadial({ treeData, mode, onFocus }: TreeRadialProps) {
  const router = useRouter();
  const ancestors = useAncestorLayout(treeData);

  const segments = useMemo(() => buildRadial(ancestors, mode), [ancestors, mode]);
  const root = ancestors.find(a => a.gen === 0);

  const viewBox = getViewBox(mode);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: mode === 'fan' ? 'flex-end' : 'center',
        padding: '24px 16px',
        overflowX: 'auto',
      }}
    >
      <svg
        viewBox={viewBox}
        style={{
          width: '100%',
          maxWidth: mode === 'fan' ? 760 : 760,
          height: mode === 'fan' ? 'auto' : 'auto',
          maxHeight: mode === 'fan' ? 470 : 600,
          display: 'block',
        }}
      >
        {/* Arc segments */}
        {segments.map(seg => (
          <g
            key={seg.node.id}
            style={{ cursor: 'pointer' }}
            onClick={() => onFocus ? onFocus(seg.node.id) : router.push(`/person/${seg.node.id}`)}
          >
            <path
              d={seg.path}
              fill={seg.fill}
              stroke={seg.stroke}
              strokeWidth={1}
              opacity={0.9}
            />
            {seg.label && (
              <text
                x={seg.textX}
                y={seg.textY}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={seg.node.gen <= 2 ? 10 : 8}
                fontWeight={seg.node.gen <= 1 ? 600 : 400}
                fill="#1c1f1c"
                transform={`rotate(${seg.textRotate}, ${seg.textX}, ${seg.textY})`}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {seg.label}
              </text>
            )}
            <title>
              {seg.node.displayName}
              {seg.node.birthYear ? ` (${seg.node.birthYear}${seg.node.deathYear ? `–${seg.node.deathYear}` : ''})` : ''}
            </title>
          </g>
        ))}

        {/* Root circle */}
        {root && (
          <g
            style={{ cursor: 'pointer' }}
            onClick={() => router.push(`/person/${root.id}`)}
          >

            <circle
              r={ROOT_R}
              fill="#1e3a2f"
              stroke="#c9a86a"
              strokeWidth={2}
            />
            <text
              y={-6}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={9}
              fontWeight={700}
              fill="#f4efe3"
              fontFamily="var(--font-serif, Georgia, serif)"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {root.displayName.split(' ').pop()?.slice(0, 12)}
            </text>
            <text
              y={8}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={9}
              fill="#9fb0a1"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {root.birthYear ?? ''}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
