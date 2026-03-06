'use client';

import { useRef, useMemo } from 'react';
import type { TreeData, LayoutNode, LayoutLink } from '@/lib/types';
import { useTreeLayout } from './useTreeLayout';
import { useTreeNavigation } from './useTreeNavigation';
import PersonNode from './PersonNode';
import TreeControls from './TreeControls';
import React from 'react';

// In horizontal mode, we swap the x/y axes:
// - horizontal (x on screen) = generation axis (was vertical/y in standard tree)
// - vertical   (y on screen) = sibling axis   (was horizontal/x in standard tree)
const GEN_SCALE = 1.6; // scale factor to compensate for node width in horizontal direction

// Horizontal family link: elbow connector going left→right
const HLink = React.memo(function HLink({ link }: { link: LayoutLink }) {
  if (link.type === 'spouse') {
    // Vertical dashed line connecting spouses in the same generation column
    const x = link.sourceX;
    const y1 = Math.min(link.sourceY, link.targetY);
    const y2 = Math.max(link.sourceY, link.targetY);
    return <line x1={x} y1={y1} x2={x} y2={y2} className="tree-link-spouse" />;
  }
  // Parent → child: horizontal elbow (right side of parent → left side of child)
  const NODE_W = 180;
  const NODE_H = 80;
  const srcX = link.sourceX + NODE_W / 2; // right edge of parent
  const srcY = link.sourceY;
  const dstX = link.targetX - NODE_W / 2; // left edge of child
  const dstY = link.targetY;
  const jX   = (srcX + dstX) / 2;

  const d = `M ${srcX} ${srcY} L ${jX} ${srcY} L ${jX} ${dstY} L ${dstX} ${dstY}`;
  return <path d={d} className="tree-link-parent" />;
});

interface HorizontalTreeProps {
  treeData: TreeData;
  selectedId: string | null;
  onNodeClick: (id: string) => void;
  onNodeDoubleClick: (id: string) => void;
  dimensions: { width: number; height: number };
}

export default function HorizontalTree({
  treeData,
  selectedId,
  onNodeClick,
  onNodeDoubleClick,
  dimensions,
}: HorizontalTreeProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Get standard vertical layout, then swap axes
  const { nodes: vNodes, links: vLinks } = useTreeLayout(treeData);

  const { nodes, links } = useMemo(() => {
    const swapNode = (n: LayoutNode): LayoutNode => ({
      ...n,
      x: n.y * GEN_SCALE, // generation axis → horizontal
      y: n.x,             // sibling axis    → vertical
    });
    const swapLink = (l: LayoutLink): LayoutLink => ({
      ...l,
      sourceX: l.sourceY * GEN_SCALE,
      sourceY: l.sourceX,
      targetX: l.targetY * GEN_SCALE,
      targetY: l.targetX,
    });
    return {
      nodes: vNodes.map(swapNode),
      links: vLinks.map(swapLink),
    };
  }, [vNodes, vLinks]);

  const { transform, centerOnRoot, zoomIn, zoomOut, fitAll } = useTreeNavigation(
    svgRef,
    nodes,
    dimensions,
  );

  return (
    <div className="relative w-full h-full">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="bg-slate-50 dark:bg-slate-950"
        style={{ cursor: 'grab' }}
      >
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
          <g className="links">
            {links.map((link, i) => (
              <HLink key={`${link.source}-${link.target}-${i}`} link={link} />
            ))}
          </g>
          <g className="nodes">
            {nodes.map(node => (
              <PersonNode
                key={node.id}
                node={node}
                isRoot={node.id === treeData.rootId}
                isSelected={node.id === selectedId}
                onClick={onNodeClick}
                onDoubleClick={onNodeDoubleClick}
              />
            ))}
          </g>
        </g>
      </svg>

      <TreeControls
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFitAll={fitAll}
        onCenterRoot={() => centerOnRoot(treeData.rootId)}
      />

      <div className="absolute bottom-6 left-6 px-3 py-1.5 bg-white/80 dark:bg-slate-800/80 rounded-lg text-xs text-slate-500 backdrop-blur-sm">
        {nodes.length} personnes
      </div>
    </div>
  );
}
