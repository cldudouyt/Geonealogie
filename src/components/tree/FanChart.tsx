'use client';

import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import * as d3 from 'd3';
import type { TreeData } from '@/lib/types';
import { useAncestorLayout, type AncestorNode } from './useAncestorLayout';
import TreeControls from './TreeControls';

const RING_WIDTH = 110;
const MAX_GEN = 6;
const FAN_START = -Math.PI / 2; // left (9 o'clock)
const FAN_END   =  Math.PI / 2; // right (3 o'clock)
const FAN_SPAN  = Math.PI;      // 180°

interface FanChartProps {
  treeData: TreeData;
  selectedId: string | null;
  onNodeClick: (id: string) => void;
  onNodeDoubleClick: (id: string) => void;
  dimensions: { width: number; height: number };
}

function arcColor(node: AncestorNode): string {
  // Paternal (even ahnen ≥ 2) → blue; maternal (odd ahnen ≥ 3) → rose; root → primary
  if (node.ahnen === 1) return '#6366f1';
  const lightness = 35 + (node.gen / MAX_GEN) * 35;
  if (node.ahnen % 2 === 0) return `hsl(214, 72%, ${lightness}%)`; // paternal blue
  return `hsl(340, 65%, ${lightness}%)`;                            // maternal rose
}

function arcColorSelected(): string { return '#f59e0b'; }

export default function FanChart({
  treeData,
  selectedId,
  onNodeClick,
  onNodeDoubleClick,
  dimensions,
}: FanChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [transform, setTransform] = useState(d3.zoomIdentity);
  const ancestors = useAncestorLayout(treeData);

  const cx = dimensions.width / 2;
  const cy = dimensions.height * 0.85;

  // D3 zoom setup
  useEffect(() => {
    if (!svgRef.current) return;
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', e => setTransform(e.transform));
    d3.select(svgRef.current).call(zoom);
    zoomRef.current = zoom;
    return () => { d3.select(svgRef.current!).on('.zoom', null); };
  }, []);

  // Center on root initially
  useEffect(() => {
    if (!svgRef.current || !zoomRef.current) return;
    const initialT = d3.zoomIdentity.translate(0, 0).scale(1);
    d3.select(svgRef.current).call(zoomRef.current.transform, initialT);
  }, [treeData]);

  const zoomIn  = useCallback(() => { if (svgRef.current && zoomRef.current) d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 1.3); }, []);
  const zoomOut = useCallback(() => { if (svgRef.current && zoomRef.current) d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 0.77); }, []);
  const fitAll  = useCallback(() => { if (svgRef.current && zoomRef.current) d3.select(svgRef.current).transition().duration(500).call(zoomRef.current.transform, d3.zoomIdentity); }, []);
  const centerRoot = useCallback(() => fitAll(), [fitAll]);

  const arcs = useMemo(() => {
    const arcGen = d3.arc<{ inner: number; outer: number; start: number; end: number }>()
      .innerRadius(d => d.inner)
      .outerRadius(d => d.outer)
      .startAngle(d => d.start)
      .endAngle(d => d.end)
      .padAngle(0.015)
      .padRadius(RING_WIDTH)
      .cornerRadius(3);

    return ancestors
      .filter(a => a.gen <= MAX_GEN)
      .map(a => {
        if (a.gen === 0) return null; // root rendered separately
        const count = Math.pow(2, a.gen);
        const startAngle = FAN_START + (a.posInGen / count) * FAN_SPAN;
        const endAngle   = FAN_START + ((a.posInGen + 1) / count) * FAN_SPAN;
        const midAngle   = (startAngle + endAngle) / 2;
        const inner = (a.gen - 1) * RING_WIDTH + 30; // gen1 starts just after root circle
        const outer = a.gen * RING_WIDTH + 30;
        const midR  = (inner + outer) / 2;

        // Arc path
        const path = arcGen({ inner, outer, start: startAngle, end: endAngle }) || '';

        // Text position and rotation
        // D3 arc uses: x = r*sin(angle), y = -r*cos(angle) — but we center at (cx, cy)
        const textX = midR * Math.sin(midAngle);
        const textY = -midR * Math.cos(midAngle);

        // Rotate text to be tangent to arc; flip if in left hemisphere
        let textRotate = (midAngle * 180 / Math.PI);
        if (midAngle < 0) textRotate += 180; // left side: flip to keep readable

        // Label visibility thresholds
        const arcDeg = (endAngle - startAngle) * 180 / Math.PI;
        const showFull  = arcDeg > 20 && a.gen <= 3;
        const showShort = arcDeg > 8  && a.gen <= 5;

        let label = '';
        if (showFull)  label = a.displayName;
        else if (showShort) {
          const parts = a.displayName.split(' ');
          label = parts[parts.length - 1]; // surname
        }

        return { a, path, textX, textY, textRotate, label, startAngle, endAngle, midAngle };
      })
      .filter(Boolean) as { a: AncestorNode; path: string; textX: number; textY: number; textRotate: number; label: string; startAngle: number; endAngle: number; midAngle: number }[];
  }, [ancestors]);

  const root = ancestors.find(a => a.gen === 0);

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
          {/* Arc segments */}
          {arcs.map(({ a, path, textX, textY, textRotate, label }) => {
            const isSelected = a.id === selectedId;
            const fill = isSelected ? arcColorSelected() : arcColor(a);
            return (
              <g
                key={a.id}
                style={{ cursor: 'pointer' }}
                onClick={e => { e.stopPropagation(); onNodeClick(a.id); }}
                onDoubleClick={e => { e.stopPropagation(); onNodeDoubleClick(a.id); }}
              >
                <path d={path} fill={fill} stroke="white" strokeWidth={1.5} opacity={0.92} />
                {label && (
                  <text
                    x={textX}
                    y={textY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={a.gen <= 2 ? 11 : 9}
                    fontWeight={a.gen <= 1 ? 600 : 400}
                    fill="white"
                    transform={`rotate(${textRotate}, ${textX}, ${textY})`}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {label.length > 16 ? label.slice(0, 15) + '…' : label}
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
              <circle r={28} fill={root.id === selectedId ? arcColorSelected() : '#6366f1'} stroke="white" strokeWidth={2} />
              <text y={-5} textAnchor="middle" dominantBaseline="middle" fontSize={9} fontWeight={700} fill="white" style={{ pointerEvents: 'none', userSelect: 'none' }}>
                {root.displayName.split(' ').pop()?.slice(0, 10)}
              </text>
              <text y={7} textAnchor="middle" dominantBaseline="middle" fontSize={8} fill="white" style={{ pointerEvents: 'none', userSelect: 'none' }}>
                {root.birthYear || ''}
              </text>
            </g>
          )}

          {/* Legend: paternal/maternal indicator */}
          <text x={-RING_WIDTH * 0.6} y={30} textAnchor="end" fontSize={9} fill="#3b82f6" opacity={0.8}>◀ Paternel</text>
          <text x={ RING_WIDTH * 0.6} y={30} textAnchor="start" fontSize={9} fill="#ec4899" opacity={0.8}>Maternel ▶</text>
        </g>
      </svg>

      <TreeControls
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFitAll={fitAll}
        onCenterRoot={centerRoot}
      />

      <div className="absolute bottom-6 left-6 px-3 py-1.5 bg-white/80 dark:bg-slate-800/80 rounded-lg text-xs text-slate-500 backdrop-blur-sm">
        {ancestors.length} ancêtres • max {MAX_GEN} générations
      </div>
    </div>
  );
}
