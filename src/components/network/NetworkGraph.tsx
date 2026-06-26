'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface NetworkNode {
  id: string;
  name: string;
  relation: string;
  sex: 'M' | 'F' | 'C';
  r: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface NetworkEdge {
  source: string | NetworkNode;
  target: string | NetworkNode;
}

interface NetworkData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

function getNodeColors(sex: 'M' | 'F' | 'C') {
  if (sex === 'C') return { fill: '#1e3a2f', stroke: '#c9a86a', text: '#f4efe3' };
  if (sex === 'M') return { fill: '#dde7f1', stroke: '#5b7da3', text: '#2a4760' };
  return { fill: '#f3e1de', stroke: '#b5736b', text: '#7a3f38' };
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

function shortenName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 2) return name;
  return parts[0] + ' ' + parts[parts.length - 1];
}

export default function NetworkGraph({ defaultFocusId }: { defaultFocusId: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isEmpty, setIsEmpty] = useState(false);
  const focusId = searchParams.get('focus') || defaultFocusId;

  useEffect(() => {
    if (!svgRef.current) return;
    let cancelled = false;

    Promise.all([
      import('d3'),
      fetch(`/api/network?focus=${focusId}`).then(r => r.json()) as Promise<NetworkData>,
    ]).then(([d3, data]) => {
      if (cancelled || !svgRef.current) return;

      const { nodes, edges } = data;

      if (!nodes || nodes.length === 0) {
        setIsEmpty(true);
        return;
      }

      setIsEmpty(false);

      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();

      const WIDTH = 760;
      const HEIGHT = 520;

      const g = svg.append('g');

      const simulation = d3.forceSimulation(nodes as d3.SimulationNodeDatum[])
        .force(
          'link',
          d3.forceLink(edges as d3.SimulationLinkDatum<d3.SimulationNodeDatum>[])
            .id((d: d3.SimulationNodeDatum) => (d as NetworkNode).id)
            .distance(180),
        )
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(WIDTH / 2, HEIGHT / 2))
        .force(
          'collision',
          d3.forceCollide<NetworkNode>().radius((d: NetworkNode) => d.r + 20),
        );

      const edgeEl = g
        .append('g')
        .selectAll<SVGLineElement, NetworkEdge>('line')
        .data(edges)
        .join('line')
        .attr('stroke', '#cdbfa3')
        .attr('stroke-width', 2);

      const nodeEl = g
        .append('g')
        .selectAll<SVGGElement, NetworkNode>('g')
        .data(nodes)
        .join('g')
        .attr('cursor', 'pointer')
        .on('click', (_event: MouseEvent, d: NetworkNode) => {
          router.push(`/person/${d.id}`);
        });

      const drag = d3
        .drag<SVGGElement, NetworkNode>()
        .on(
          'start',
          (event: d3.D3DragEvent<SVGGElement, NetworkNode, NetworkNode>, d: NetworkNode) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          },
        )
        .on(
          'drag',
          (event: d3.D3DragEvent<SVGGElement, NetworkNode, NetworkNode>, d: NetworkNode) => {
            d.fx = event.x;
            d.fy = event.y;
          },
        )
        .on(
          'end',
          (event: d3.D3DragEvent<SVGGElement, NetworkNode, NetworkNode>, d: NetworkNode) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          },
        );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (nodeEl as any).call(drag);

      nodeEl
        .append('circle')
        .attr('r', (d: NetworkNode) => d.r)
        .attr('fill', (d: NetworkNode) => getNodeColors(d.sex).fill)
        .attr('stroke', (d: NetworkNode) => getNodeColors(d.sex).stroke)
        .attr('stroke-width', 2.5);

      nodeEl
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('font-family', 'Hanken Grotesk, sans-serif')
        .attr('font-weight', '700')
        .attr('font-size', (d: NetworkNode) => (d.sex === 'C' ? '15' : '13'))
        .attr('fill', (d: NetworkNode) => getNodeColors(d.sex).text)
        .attr('pointer-events', 'none')
        .text((d: NetworkNode) => getInitials(d.name));

      nodeEl
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('y', (d: NetworkNode) => d.r + 16)
        .attr('font-family', 'Hanken Grotesk, sans-serif')
        .attr('font-size', '11.5')
        .attr('font-weight', '700')
        .attr('fill', '#3a4038')
        .attr('pointer-events', 'none')
        .text((d: NetworkNode) => shortenName(d.name));

      nodeEl
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('y', (d: NetworkNode) => d.r + 30)
        .attr('font-family', 'Hanken Grotesk, sans-serif')
        .attr('font-size', '10')
        .attr('fill', '#8a8474')
        .attr('pointer-events', 'none')
        .text((d: NetworkNode) => d.relation);

      nodeEl
        .on('mouseenter', function (_event: MouseEvent, d: NetworkNode) {
          d3.select(this)
            .select('circle')
            .attr('stroke-width', '4')
            .attr('filter', 'drop-shadow(0 2px 6px rgba(0,0,0,.18))');
          edgeEl.attr('stroke-opacity', (e: NetworkEdge) => {
            const src =
              typeof e.source === 'string' ? e.source : (e.source as NetworkNode).id;
            const tgt =
              typeof e.target === 'string' ? e.target : (e.target as NetworkNode).id;
            return src === d.id || tgt === d.id ? 1 : 0.2;
          });
        })
        .on('mouseleave', function () {
          d3.select(this)
            .select('circle')
            .attr('stroke-width', '2.5')
            .attr('filter', null);
          edgeEl.attr('stroke-opacity', 1);
        });

      simulation.on('tick', () => {
        edgeEl
          .attr('x1', (d: NetworkEdge) => (d.source as NetworkNode).x ?? 0)
          .attr('y1', (d: NetworkEdge) => (d.source as NetworkNode).y ?? 0)
          .attr('x2', (d: NetworkEdge) => (d.target as NetworkNode).x ?? 0)
          .attr('y2', (d: NetworkEdge) => (d.target as NetworkNode).y ?? 0);
        nodeEl.attr('transform', (d: NetworkNode) => `translate(${d.x ?? 0},${d.y ?? 0})`);
      });

      (svgRef.current as unknown as { _sim?: ReturnType<typeof d3.forceSimulation> })._sim =
        simulation;
    });

    return () => {
      cancelled = true;
      const el = svgRef.current;
      if (el) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        const sim = (el as unknown as { _sim?: { stop: () => void } })._sim;
        sim?.stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        backgroundImage: 'radial-gradient(#e4dcc8 1px, transparent 1px)',
        backgroundSize: '22px 22px',
        backgroundColor: '#fbf9f3',
        borderRadius: '20px',
        border: '1px solid #e9e2d2',
        padding: '16px',
        minHeight: '540px',
      }}
    >
      {isEmpty ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            color: '#8a8474',
            fontFamily: 'Hanken Grotesk, sans-serif',
            fontSize: '14px',
          }}
        >
          Aucune relation trouvée pour cette personne.
        </div>
      ) : (
        <svg
          ref={svgRef}
          viewBox="0 0 760 520"
          style={{ width: '100%', maxWidth: '760px' }}
          preserveAspectRatio="xMidYMid meet"
        />
      )}
    </div>
  );
}
