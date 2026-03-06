'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { LayoutNode } from '@/lib/types';

export function useTreeNavigation(
  svgRef: React.RefObject<SVGSVGElement | null>,
  nodes: LayoutNode[],
  dimensions: { width: number; height: number }
) {
  const [transform, setTransform] = useState(d3.zoomIdentity);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.05, 3])
      .on('zoom', (event) => {
        setTransform(event.transform);
      });

    d3.select(svgRef.current).call(zoom);
    zoomBehaviorRef.current = zoom;

    return () => {
      d3.select(svgRef.current!).on('.zoom', null);
    };
  }, [svgRef]);

  const centerOnPerson = useCallback((personId: string) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;

    const node = nodes.find(n => n.id === personId);
    if (!node) return;

    const svg = d3.select(svgRef.current);
    svg.transition()
      .duration(750)
      .call(
        zoomBehaviorRef.current.transform,
        d3.zoomIdentity
          .translate(dimensions.width / 2, dimensions.height / 2)
          .scale(1)
          .translate(-node.x, -node.y)
      );
  }, [svgRef, nodes, dimensions]);

  const centerOnRoot = useCallback((rootId: string) => {
    centerOnPerson(rootId);
  }, [centerOnPerson]);

  const zoomIn = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(300)
      .call(zoomBehaviorRef.current.scaleBy, 1.3);
  }, [svgRef]);

  const zoomOut = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(300)
      .call(zoomBehaviorRef.current.scaleBy, 0.7);
  }, [svgRef]);

  const fitAll = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current || nodes.length === 0) return;

    const minX = Math.min(...nodes.map(n => n.x)) - 100;
    const maxX = Math.max(...nodes.map(n => n.x)) + 280;
    const minY = Math.min(...nodes.map(n => n.y)) - 50;
    const maxY = Math.max(...nodes.map(n => n.y)) + 130;

    const treeWidth = maxX - minX;
    const treeHeight = maxY - minY;

    const scale = Math.min(
      dimensions.width / treeWidth,
      dimensions.height / treeHeight,
      1.5
    ) * 0.9;

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    d3.select(svgRef.current)
      .transition()
      .duration(750)
      .call(
        zoomBehaviorRef.current.transform,
        d3.zoomIdentity
          .translate(dimensions.width / 2, dimensions.height / 2)
          .scale(scale)
          .translate(-centerX, -centerY)
      );
  }, [svgRef, nodes, dimensions]);

  return { transform, centerOnPerson, centerOnRoot, zoomIn, zoomOut, fitAll };
}
