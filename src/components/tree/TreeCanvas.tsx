'use client';

import { useRef, useMemo, useEffect } from 'react';
import type { LayoutNode, LayoutLink } from '@/lib/types';
import { useTreeNavigation } from './useTreeNavigation';
import PersonNode from './PersonNode';
import FamilyLink from './FamilyLink';
import TreeControls from './TreeControls';

const VIEWPORT_BUFFER = 200;
const NODE_WIDTH = 190;
const NODE_HEIGHT = 92;

interface TreeCanvasProps {
  nodes: LayoutNode[];
  links: LayoutLink[];
  rootId: string;
  selectedId: string | null;
  onNodeClick: (id: string) => void;
  onNodeDoubleClick: (id: string) => void;
  dimensions: { width: number; height: number };
}

export default function TreeCanvas({
  nodes,
  links,
  rootId,
  selectedId,
  onNodeClick,
  onNodeDoubleClick,
  dimensions,
}: TreeCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { transform, centerOnRoot, zoomIn, zoomOut, fitAll } = useTreeNavigation(
    svgRef,
    nodes,
    dimensions
  );

  const centeredRootRef = useRef<string | null>(null);
  useEffect(() => {
    if (nodes.length > 0 && centeredRootRef.current !== rootId) {
      centeredRootRef.current = rootId;
      centerOnRoot(rootId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootId, nodes.length]);

  const visibleNodes = useMemo(() => {
    const { x: tx, y: ty, k: scale } = transform;
    const viewLeft   = (-tx / scale) - VIEWPORT_BUFFER;
    const viewRight  = (-tx / scale) + (dimensions.width  / scale) + VIEWPORT_BUFFER;
    const viewTop    = (-ty / scale) - VIEWPORT_BUFFER;
    const viewBottom = (-ty / scale) + (dimensions.height / scale) + VIEWPORT_BUFFER;

    return nodes.filter(node =>
      node.x + NODE_WIDTH  / 2 > viewLeft  &&
      node.x - NODE_WIDTH  / 2 < viewRight &&
      node.y + NODE_HEIGHT / 2 > viewTop   &&
      node.y - NODE_HEIGHT / 2 < viewBottom
    );
  }, [nodes, transform, dimensions]);

  return (
    <div className="relative w-full h-full">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{ cursor: 'grab', background: 'radial-gradient(ellipse at 50% 45%, #fdf8f2 0%, #f5eddf 60%, #ede2cf 100%)' }}
      >

        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
          <g className="links">
            {links.map((link, i) => (
              <FamilyLink key={`${link.source}-${link.target}-${i}`} link={link} />
            ))}
          </g>
          <g className="nodes">
            {visibleNodes.map(node => (
              <PersonNode
                key={node.id}
                node={node}
                isRoot={node.id === rootId}
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
        onCenterRoot={() => centerOnRoot(rootId)}
      />

      <div className="absolute bottom-6 left-6 px-3 py-1.5 bg-white/80 dark:bg-slate-800/80 rounded-lg text-xs text-slate-500 backdrop-blur-sm shadow-sm border border-stone-200/50">
        {nodes.length} personnes · {visibleNodes.length} affichées
      </div>
    </div>
  );
}
