'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Node {
  id: string;
  name: string;
  sex: 'M' | 'F' | 'U';
  birthYear: number | null;
  surname: string;
  // D3 mutable
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface Link {
  source: string | Node;
  target: string | Node;
  type: 'spouse' | 'parent';
}

function nodeColor(sex: 'M' | 'F' | 'U'): string {
  return sex === 'M' ? '#3b82f6' : sex === 'F' ? '#ec4899' : '#94a3b8';
}

export default function NetworkGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const router = useRouter();
  const [total, setTotal] = useState<number | null>(null);
  const [filter, setFilter] = useState('');
  const [highlighted, setHighlighted] = useState<string | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    let cancelled = false;

    Promise.all([
      import('d3'),
      fetch('/api/network').then(r => r.json()),
    ]).then(([d3, data]) => {
      if (cancelled || !svgRef.current) return;
      const { nodes, links }: { nodes: Node[]; links: Link[] } = data;
      setTotal(nodes.length);

      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();

      const width = svgRef.current.clientWidth || 900;
      const height = svgRef.current.clientHeight || 600;

      const g = svg.append('g');

      // Zoom
      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.05, 4])
        .on('zoom', (event) => g.attr('transform', event.transform));
      svg.call(zoom);
      svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(0.3));

      // Simulation
      const simulation = d3.forceSimulation(nodes as d3.SimulationNodeDatum[])
        .force('link', d3.forceLink(links).id((d: d3.SimulationNodeDatum) => (d as Node).id).distance((l: { type?: string }) => l.type === 'spouse' ? 60 : 80).strength(0.4))
        .force('charge', d3.forceManyBody().strength(-120))
        .force('collision', d3.forceCollide(18))
        .alphaDecay(0.03);

      // Links
      const linkEl = g.append('g').selectAll('line').data(links).join('line')
        .attr('stroke', (d) => d.type === 'spouse' ? '#f472b6' : '#94a3b8')
        .attr('stroke-opacity', 0.5)
        .attr('stroke-width', (d) => d.type === 'spouse' ? 1.5 : 1)
        .attr('stroke-dasharray', (d) => d.type === 'spouse' ? '4 2' : 'none');

      // Nodes group
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nodeEl = (g.append('g').selectAll('g').data(nodes).join('g') as any)
        .attr('cursor', 'pointer')
        .call(d3.drag<SVGGElement, Node>()
          .on('start', (event: d3.D3DragEvent<SVGGElement, Node, Node>, d: Node) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
          .on('drag', (event: d3.D3DragEvent<SVGGElement, Node, Node>, d: Node) => { d.fx = event.x; d.fy = event.y; })
          .on('end', (event: d3.D3DragEvent<SVGGElement, Node, Node>, d: Node) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }))
        .on('click', (_event: MouseEvent, d: Node) => router.push(`/person/${d.id}`));

      nodeEl.append('circle')
        .attr('r', 10)
        .attr('fill', (d: Node) => nodeColor(d.sex))
        .attr('stroke', 'white')
        .attr('stroke-width', 1.5)
        .attr('fill-opacity', 0.85);

      nodeEl.append('text')
        .attr('dy', '0.31em')
        .attr('x', 13)
        .attr('font-size', 9)
        .attr('fill', '#334155')
        .text((d: Node) => d.name.length > 20 ? d.name.slice(0, 18) + '…' : d.name);

      simulation.on('tick', () => {
        linkEl
          .attr('x1', (d: Link) => (d.source as Node).x ?? 0)
          .attr('y1', (d: Link) => (d.source as Node).y ?? 0)
          .attr('x2', (d: Link) => (d.target as Node).x ?? 0)
          .attr('y2', (d: Link) => (d.target as Node).y ?? 0);
        nodeEl.attr('transform', (d: Node) => `translate(${d.x ?? 0},${d.y ?? 0})`);
      });

      // Store cleanup
      (svgRef.current as unknown as { _sim?: ReturnType<typeof d3.forceSimulation> })._sim = simulation;
    });

    return () => {
      cancelled = true;
      if (svgRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        const sim = (svgRef.current as unknown as { _sim?: { stop: () => void } })._sim;
        sim?.stop();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Highlight on filter
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = svgRef.current;
    const term = filter.toLowerCase().trim();
    svg.querySelectorAll('g g').forEach((el) => {
      const text = el.querySelector('text')?.textContent?.toLowerCase() ?? '';
      const circle = el.querySelector('circle');
      if (!circle) return;
      if (!term) {
        circle.style.opacity = '1';
        circle.setAttribute('r', '10');
      } else if (text.includes(term)) {
        circle.style.opacity = '1';
        circle.setAttribute('r', '13');
        setHighlighted(text);
      } else {
        circle.style.opacity = '0.1';
        circle.setAttribute('r', '10');
      }
    });
  }, [filter]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Controls */}
      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filtrer par nom…"
          style={{
            padding: '5px 10px', borderRadius: 6, border: '1px solid #e2e8f0',
            fontSize: 12, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(4px)',
            width: 180,
          }}
        />
        {filter && <button onClick={() => setFilter('')} style={{ fontSize: 11, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>}
      </div>
      {/* Legend */}
      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(4px)', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#475569' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#3b82f6', marginRight: 6 }} />Homme</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#ec4899', marginRight: 6 }} />Femme</span>
          <span style={{ borderTop: '1px dashed #f472b6', paddingTop: 4 }}>— — Mariage</span>
          <span>——— Filiation</span>
        </div>
      </div>
      {/* Count */}
      {total !== null && (
        <div style={{ position: 'absolute', bottom: 12, left: 12, zIndex: 10, background: 'rgba(15,23,42,0.7)', color: '#94a3b8', fontSize: 11, padding: '3px 8px', borderRadius: 4 }}>
          {total} personnes · clic pour ouvrir la fiche · molette pour zoomer
        </div>
      )}
      <svg ref={svgRef} style={{ width: '100%', height: '100%', background: '#f8fafc' }} />
    </div>
  );
}
