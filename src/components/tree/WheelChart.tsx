'use client';

import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import * as d3 from 'd3';
import type { TreeData } from '@/lib/types';
import { useAncestorLayout, type AncestorNode } from './useAncestorLayout';
import TreeControls from './TreeControls';

const ROOT_R    = 42;
const RING_WIDTH = 80;
const MAX_GEN   = 7;

interface WheelChartProps {
  treeData: TreeData;
  selectedId: string | null;
  onNodeClick: (id: string) => void;
  onNodeDoubleClick: (id: string) => void;
  dimensions: { width: number; height: number };
}

function arcColor(node: AncestorNode): string {
  if (node.ahnen === 1) return '#6366f1';
  // Shade gets lighter with generation
  const lightness = 30 + (node.gen / MAX_GEN) * 40;
  // Paternal = blue half (even ahnen), maternal = rose half (odd ahnen)
  const isPat = node.ahnen % 2 === 0;
  return isPat
    ? `hsl(210, 70%, ${lightness}%)`
    : `hsl(340, 65%, ${lightness}%)`;
}

export default function WheelChart({
  treeData,
  selectedId,
  onNodeClick,
  onNodeDoubleClick,
  dimensions,
}: WheelChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [transform, setTransform] = useState(d3.zoomIdentity);
  const ancestors = useAncestorLayout(treeData);

  const cx = dimensions.width / 2;
  const cy = dimensions.height / 2;

  useEffect(() => {
    if (!svgRef.current) return;
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', e => setTransform(e.transform));
    d3.select(svgRef.current).call(zoom);
    zoomRef.current = zoom;
    return () => { d3.select(svgRef.current!).on('.zoom', null); };
  }, []);

  useEffect(() => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).call(zoomRef.current.transform, d3.zoomIdentity);
  }, [treeData]);

  const zoomIn  = useCallback(() => { if (svgRef.current && zoomRef.current) d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 1.3); }, []);
  const zoomOut = useCallback(() => { if (svgRef.current && zoomRef.current) d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 0.77); }, []);
  const fitAll  = useCallback(() => { if (svgRef.current && zoomRef.current) d3.select(svgRef.current).transition().duration(500).call(zoomRef.current.transform, d3.zoomIdentity); }, []);

  const arcs = useMemo(() => {
    const arcGen = d3.arc<{ inner: number; outer: number; start: number; end: number }>()
      .innerRadius(d => d.inner)
      .outerRadius(d => d.outer)
      .startAngle(d => d.start)
      .endAngle(d => d.end)
      .padAngle(0.012)
      .padRadius(ROOT_R)
      .cornerRadius(2);

    return ancestors
      .filter(a => a.gen > 0 && a.gen <= MAX_GEN)
      .map(a => {
        const count = Math.pow(2, a.gen);
        // Full 360° wheel: father top-left half, mother top-right half
        // Offset by -π/2 so gen-0 starts at top (12 o'clock)
        const startAngle = -Math.PI / 2 + (a.posInGen / count) * 2 * Math.PI;
        const endAngle   = -Math.PI / 2 + ((a.posInGen + 1) / count) * 2 * Math.PI;
        const midAngle   = (startAngle + endAngle) / 2;

        const inner = ROOT_R + 6 + (a.gen - 1) * RING_WIDTH;
        const outer = ROOT_R + 6 + a.gen * RING_WIDTH - 2;
        const midR  = (inner + outer) / 2;

        const path = arcGen({ inner, outer, start: startAngle, end: endAngle }) || '';

        // Text positioning (D3: x=r*sin, y=-r*cos)
        const textX = midR * Math.sin(midAngle);
        const textY = -midR * Math.cos(midAngle);
        let textRotate = midAngle * 180 / Math.PI;
        // Flip text on left half to stay upright
        if (textRotate > 90 || textRotate < -90) textRotate += 180;

        const arcDeg = (endAngle - startAngle) * 180 / Math.PI;
        const showFull  = arcDeg > 25 && a.gen <= 3;
        const showShort = arcDeg > 10 && a.gen <= 5;

        let label = '';
        if (showFull)  label = a.displayName;
        else if (showShort) {
          const parts = a.displayName.trim().split(' ');
          label = parts[parts.length - 1];
        }

        return { a, path, textX, textY, textRotate, label };
      });
  }, [ancestors]);

  const root = ancestors.find(a => a.gen === 0);
  const maxGenPresent = Math.min(MAX_GEN, Math.max(...ancestors.map(a => a.gen), 0));

  return (
    <div className="relative w-full h-full">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="bg-slate-50 dark:bg-slate-950"
        style={{ cursor: 'grab' }}
      >
        <g transform={`translate(${cx + transform.x}, ${cy + transform.y}) scale(${transform.k})`}>
          {/* Generation ring labels */}
          {Array.from({ length: maxGenPresent }, (_, i) => i + 1).map(gen => {
            const r = ROOT_R + 6 + gen * RING_WIDTH - RING_WIDTH / 2;
            const label = gen === 1 ? 'Parents' : gen === 2 ? 'GP' : gen === 3 ? 'GGP' : `G${gen}`;
            return (
              <text
                key={gen}
                x={0}
                y={-(r)}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={8}
                fill="rgba(255,255,255,0.5)"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {label}
              </text>
            );
          })}

          {/* Arc segments */}
          {arcs.map(({ a, path, textX, textY, textRotate, label }) => {
            const isSelected = a.id === selectedId;
            const fill = isSelected ? '#f59e0b' : arcColor(a);
            return (
              <g
                key={a.id}
                style={{ cursor: 'pointer' }}
                onClick={e => { e.stopPropagation(); onNodeClick(a.id); }}
                onDoubleClick={e => { e.stopPropagation(); onNodeDoubleClick(a.id); }}
              >
                <path d={path} fill={fill} stroke="white" strokeWidth={1} opacity={0.9} />
                {label && (
                  <text
                    x={textX}
                    y={textY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={a.gen <= 2 ? 10 : 8}
                    fontWeight={a.gen <= 1 ? 600 : 400}
                    fill="white"
                    transform={`rotate(${textRotate}, ${textX}, ${textY})`}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {label.length > 14 ? label.slice(0, 13) + '…' : label}
                  </text>
                )}
                <title>{a.displayName}{a.birthYear ? ` (${a.birthYear}${a.deathYear ? `–${a.deathYear}` : ''})` : ''}</title>
              </g>
            );
          })}

          {/* Root circle */}
          {root && (
            <g
              style={{ cursor: 'pointer' }}
              onClick={e => { e.stopPropagation(); onNodeClick(root.id); }}
              onDoubleClick={e => { e.stopPropagation(); onNodeDoubleClick(root.id); }}
            >
              <circle r={ROOT_R} fill={root.id === selectedId ? '#f59e0b' : '#6366f1'} stroke="white" strokeWidth={2} />
              <text y={-6} textAnchor="middle" dominantBaseline="middle" fontSize={9} fontWeight={700} fill="white" style={{ pointerEvents: 'none', userSelect: 'none' }}>
                {root.displayName.split(' ').pop()?.slice(0, 12)}
              </text>
              <text y={7} textAnchor="middle" dominantBaseline="middle" fontSize={8} fill="rgba(255,255,255,0.8)" style={{ pointerEvents: 'none', userSelect: 'none' }}>
                {root.birthYear || ''}
              </text>
            </g>
          )}

          {/* Paternal / Maternal indicators */}
          <text x={-(ROOT_R + 6 + maxGenPresent * RING_WIDTH + 10)} y={-4} textAnchor="end" fontSize={10} fill="#3b82f6" opacity={0.7}>◀ Paternel</text>
          <text x={ ROOT_R + 6 + maxGenPresent * RING_WIDTH + 10} y={-4} textAnchor="start" fontSize={10} fill="#ec4899" opacity={0.7}>Maternel ▶</text>
        </g>
      </svg>

      <TreeControls
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFitAll={fitAll}
        onCenterRoot={fitAll}
      />

      <div className="absolute bottom-6 left-6 px-3 py-1.5 bg-white/80 dark:bg-slate-800/80 rounded-lg text-xs text-slate-500 backdrop-blur-sm">
        {ancestors.length} ancêtres • {maxGenPresent} générations
      </div>
    </div>
  );
}
