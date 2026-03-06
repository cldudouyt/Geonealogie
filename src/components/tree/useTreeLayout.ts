'use client';

import { useMemo } from 'react';
import type { TreeData, TreeNode, TreeLink, LayoutNode, LayoutLink } from '@/lib/types';

const NODE_WIDTH = 180;
const NODE_HEIGHT = 80;
const GENERATION_GAP = 150;
const H_GAP = 40;        // gap between unrelated nodes/couples
const SPOUSE_GAP = 20;   // gap between spouses

interface LayoutResult {
  nodes: LayoutNode[];
  links: LayoutLink[];
}

export function useTreeLayout(treeData: TreeData | null): LayoutResult {
  return useMemo(() => {
    if (!treeData || treeData.nodes.length === 0) {
      return { nodes: [], links: [] };
    }

    const { rootId, nodes, links } = treeData;
    const nodeSet = new Set(nodes.map(n => n.id));

    // ─── Build adjacency maps ───────────────────────────────────────────────
    const childToParents = new Map<string, string[]>();
    const parentToChildren = new Map<string, string[]>();
    const spouseMap = new Map<string, string[]>();

    for (const link of links) {
      if (link.type === 'parent') {
        const p = childToParents.get(link.target) || [];
        p.push(link.source);
        childToParents.set(link.target, p);

        const c = parentToChildren.get(link.source) || [];
        c.push(link.target);
        parentToChildren.set(link.source, c);
      } else if (link.type === 'spouse') {
        const s1 = spouseMap.get(link.source) || [];
        s1.push(link.target);
        spouseMap.set(link.source, s1);

        const s2 = spouseMap.get(link.target) || [];
        s2.push(link.source);
        spouseMap.set(link.target, s2);
      }
    }

    // ─── Assign generations via BFS ─────────────────────────────────────────
    const generations = new Map<string, number>();
    const visited = new Set<string>();
    const q: Array<{ id: string; gen: number }> = [{ id: rootId, gen: 0 }];
    visited.add(rootId);

    while (q.length > 0) {
      const { id, gen } = q.shift()!;
      generations.set(id, gen);

      for (const pid of (childToParents.get(id) || [])) {
        if (!visited.has(pid)) { visited.add(pid); q.push({ id: pid, gen: gen - 1 }); }
      }
      for (const cid of (parentToChildren.get(id) || [])) {
        if (!visited.has(cid)) { visited.add(cid); q.push({ id: cid, gen: gen + 1 }); }
      }
      for (const sid of (spouseMap.get(id) || [])) {
        if (!visited.has(sid)) { visited.add(sid); q.push({ id: sid, gen }); }
      }
    }

    // For nodes not reached by BFS (disconnected sub-trees), estimate generation
    // from birth year so they spread across rows instead of piling at gen 0.
    const rootNode = nodes.find(n => n.id === rootId);
    const rootYear = parseInt(rootNode?.birthYear || '1900');
    const GEN_YEARS = 27; // ~27 years per generation

    for (const node of nodes) {
      if (!generations.has(node.id)) {
        const year = parseInt(node.birthYear || '0');
        generations.set(node.id, year > 0 ? Math.round((year - rootYear) / GEN_YEARS) : 0);
      }
    }

    // Group by generation (only nodes present in our set)
    const genGroups = new Map<number, string[]>();
    for (const [id, gen] of generations.entries()) {
      if (!nodeSet.has(id)) continue;
      const g = genGroups.get(gen) || [];
      g.push(id);
      genGroups.set(gen, g);
    }

    const positions = new Map<string, { x: number; y: number }>();

    // ─── Helpers ─────────────────────────────────────────────────────────────

    // Build couple-units for a generation (person + their same-gen spouses)
    function buildUnits(gen: number): string[][] {
      const group = genGroups.get(gen) || [];
      const done = new Set<string>();
      const units: string[][] = [];
      for (const id of group) {
        if (done.has(id)) continue;
        done.add(id);
        const spouses = (spouseMap.get(id) || []).filter(
          s => generations.get(s) === gen && !done.has(s) && nodeSet.has(s)
        );
        spouses.forEach(s => done.add(s));
        units.push([id, ...spouses]);
      }
      return units;
    }

    // Width of a couple-unit
    function unitWidth(unit: string[]): number {
      return unit.length * NODE_WIDTH + (unit.length - 1) * SPOUSE_GAP;
    }

    // Expected center-x for a unit based on its reference nodes in the adjacent generation
    // For ancestors (gen < 0): reference = children in gen+1 (already placed)
    // For descendants (gen > 0): reference = parents in gen-1 (already placed)
    function refX(unit: string[], gen: number): number | null {
      let refs: string[] = [];
      if (gen <= 0) {
        refs = unit.flatMap(uid =>
          (parentToChildren.get(uid) || []).filter(
            cid => generations.get(cid) === gen + 1 && positions.has(cid)
          )
        );
      } else {
        refs = unit.flatMap(uid =>
          (childToParents.get(uid) || []).filter(
            pid => generations.get(pid) === gen - 1 && positions.has(pid)
          )
        );
      }
      if (refs.length === 0) return null;
      const xs = refs.map(id => positions.get(id)!.x);
      return xs.reduce((a, b) => a + b, 0) / xs.length;
    }

    // Place a generation's couple-units, sorted by refX to minimize crossings
    function placeGeneration(gen: number) {
      const y = gen * GENERATION_GAP;
      const units = buildUnits(gen);
      if (units.length === 0) return;

      // Compute reference x for each unit
      const refs = units.map(unit => ({ unit, rx: refX(unit, gen), w: unitWidth(unit) }));

      // Sort by reference x (units with no reference go to the end)
      refs.sort((a, b) => {
        if (a.rx === null && b.rx === null) return 0;
        if (a.rx === null) return 1;
        if (b.rx === null) return -1;
        return a.rx - b.rx;
      });

      // Greedy placement: place each unit at its target x, but never left of the cursor
      // target_x is the left edge of the unit such that its center = refX
      const placed: Array<{ unit: string[]; left: number; w: number }> = [];
      let cursor = -Infinity;

      for (const { unit, rx, w } of refs) {
        // Target left edge so center of unit = rx
        const target = rx !== null ? rx - w / 2 + NODE_WIDTH / 2 : cursor === -Infinity ? 0 : cursor;
        const left = Math.max(cursor === -Infinity ? target : cursor, target);
        placed.push({ unit, left, w });
        cursor = left + w + H_GAP;
      }

      // Center the whole generation around the weighted center of refX values
      const hasRef = refs.filter(r => r.rx !== null);
      if (hasRef.length > 0) {
        const desiredCenter = hasRef.reduce((s, r) => s + r.rx!, 0) / hasRef.length;
        const firstLeft = placed[0].left;
        const lastRight = placed[placed.length - 1].left + placed[placed.length - 1].w;
        const currentCenter = (firstLeft + lastRight) / 2;
        const shift = desiredCenter - currentCenter;

        // Apply shift but re-resolve overlaps afterwards
        for (const item of placed) item.left += shift;
        for (let i = 1; i < placed.length; i++) {
          const minLeft = placed[i - 1].left + placed[i - 1].w + H_GAP;
          if (placed[i].left < minLeft) placed[i].left = minLeft;
        }
      }

      // Write positions
      for (const { unit, left } of placed) {
        for (let i = 0; i < unit.length; i++) {
          positions.set(unit[i], { x: left + i * (NODE_WIDTH + SPOUSE_GAP), y });
        }
      }
    }

    // ─── Place gen 0 (root) ────────────────────────────────────────────────
    // Root at center, spouse(s) adjacent, group centered around 0
    const gen0Done = new Set<string>();
    const rootUnit: string[] = [rootId];
    gen0Done.add(rootId);
    for (const sid of (spouseMap.get(rootId) || []).filter(s => nodeSet.has(s) && generations.get(s) === 0)) {
      rootUnit.push(sid);
      gen0Done.add(sid);
    }

    // Any remaining gen-0 nodes (non-spouse, non-root)
    const gen0Extra = (genGroups.get(0) || []).filter(id => !gen0Done.has(id));

    const gen0Units = [rootUnit, ...gen0Extra.map(id => [id])];
    const gen0TotalWidth = gen0Units.reduce((s, u) => s + unitWidth(u), 0) + (gen0Units.length - 1) * H_GAP;
    let x0 = -gen0TotalWidth / 2;
    for (const unit of gen0Units) {
      for (let i = 0; i < unit.length; i++) {
        positions.set(unit[i], { x: x0 + i * (NODE_WIDTH + SPOUSE_GAP), y: 0 });
      }
      x0 += unitWidth(unit) + H_GAP;
    }

    // ─── Place ancestor generations (gen -1, -2, …) ───────────────────────
    const negGens = Array.from(genGroups.keys()).filter(g => g < 0).sort((a, b) => b - a);
    for (const gen of negGens) placeGeneration(gen);

    // ─── Place descendant generations (gen 1, 2, …) ───────────────────────
    const posGens = Array.from(genGroups.keys()).filter(g => g > 0).sort((a, b) => a - b);
    for (const gen of posGens) placeGeneration(gen);

    // ─── Build output ──────────────────────────────────────────────────────
    const layoutNodes: LayoutNode[] = nodes
      .filter(n => positions.has(n.id))
      .map(n => ({ ...n, ...positions.get(n.id)! }));

    const layoutLinks: LayoutLink[] = links
      .filter(l => positions.has(l.source) && positions.has(l.target))
      .map(l => ({
        ...l,
        sourceX: positions.get(l.source)!.x,
        sourceY: positions.get(l.source)!.y,
        targetX: positions.get(l.target)!.x,
        targetY: positions.get(l.target)!.y,
      }));

    return { nodes: layoutNodes, links: layoutLinks };
  }, [treeData]);
}
