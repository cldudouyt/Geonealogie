'use client';

import { useMemo } from 'react';
import type { TreeData, TreeNode, TreeLink, LayoutNode, LayoutLink } from '@/lib/types';

const NODE_WIDTH = 180;
const NODE_HEIGHT = 80;
const GENERATION_GAP = 140;
const SIBLING_GAP = 30;
const SPOUSE_GAP = 20;

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

    // Build adjacency maps
    const childToParents = new Map<string, string[]>();
    const parentToChildren = new Map<string, string[]>();
    const spouseMap = new Map<string, string[]>();

    for (const link of links) {
      if (link.type === 'parent') {
        // source = parent, target = child
        const parents = childToParents.get(link.target) || [];
        parents.push(link.source);
        childToParents.set(link.target, parents);

        const children = parentToChildren.get(link.source) || [];
        children.push(link.target);
        parentToChildren.set(link.source, children);
      } else if (link.type === 'spouse') {
        const s1 = spouseMap.get(link.source) || [];
        s1.push(link.target);
        spouseMap.set(link.source, s1);

        const s2 = spouseMap.get(link.target) || [];
        s2.push(link.source);
        spouseMap.set(link.target, s2);
      }
    }

    // Assign generations via BFS from root
    const generations = new Map<string, number>();
    const visited = new Set<string>();
    const queue: Array<{ id: string; gen: number }> = [{ id: rootId, gen: 0 }];
    visited.add(rootId);

    while (queue.length > 0) {
      const { id, gen } = queue.shift()!;
      generations.set(id, gen);

      // Parents -> negative generation
      const parents = childToParents.get(id) || [];
      for (const parentId of parents) {
        if (!visited.has(parentId)) {
          visited.add(parentId);
          queue.push({ id: parentId, gen: gen - 1 });
        }
      }

      // Children -> positive generation
      const children = parentToChildren.get(id) || [];
      for (const childId of children) {
        if (!visited.has(childId)) {
          visited.add(childId);
          queue.push({ id: childId, gen: gen + 1 });
        }
      }

      // Spouses -> same generation
      const spouses = spouseMap.get(id) || [];
      for (const spouseId of spouses) {
        if (!visited.has(spouseId)) {
          visited.add(spouseId);
          queue.push({ id: spouseId, gen: gen });
        }
      }
    }

    // For any nodes not reached by BFS, assign generation 0
    const nodeMap = new Map<string, TreeNode>();
    for (const node of nodes) {
      nodeMap.set(node.id, node);
      if (!generations.has(node.id)) {
        generations.set(node.id, 0);
      }
    }

    // Group by generation
    const genGroups = new Map<number, string[]>();
    for (const [id, gen] of generations.entries()) {
      const group = genGroups.get(gen) || [];
      group.push(id);
      genGroups.set(gen, group);
    }

    // Sort generation keys
    const sortedGens = Array.from(genGroups.keys()).sort((a, b) => a - b);

    // Position nodes
    const positions = new Map<string, { x: number; y: number }>();

    for (const gen of sortedGens) {
      const group = genGroups.get(gen) || [];
      const y = gen * GENERATION_GAP;

      // Identify couples in this generation
      const placed = new Set<string>();
      const items: Array<{ ids: string[]; width: number }> = [];

      for (const id of group) {
        if (placed.has(id)) continue;

        const spouses = (spouseMap.get(id) || []).filter(
          sid => generations.get(sid) === gen && !placed.has(sid) && group.includes(sid)
        );

        if (spouses.length > 0) {
          const coupleIds = [id, ...spouses];
          coupleIds.forEach(cid => placed.add(cid));
          items.push({
            ids: coupleIds,
            width: coupleIds.length * NODE_WIDTH + (coupleIds.length - 1) * SPOUSE_GAP,
          });
        } else {
          placed.add(id);
          items.push({ ids: [id], width: NODE_WIDTH });
        }
      }

      // Calculate total width
      const totalWidth = items.reduce((sum, item) => sum + item.width, 0) + (items.length - 1) * SIBLING_GAP;
      let x = -totalWidth / 2;

      // Try to center children under their parents
      for (const item of items) {
        const firstId = item.ids[0];
        const parents = childToParents.get(firstId) || [];
        const parentPositions = parents
          .map(pid => positions.get(pid))
          .filter(Boolean) as Array<{ x: number; y: number }>;

        if (parentPositions.length > 0 && gen > 0) {
          // Center under parents
          const parentCenterX = parentPositions.reduce((sum, p) => sum + p.x, 0) / parentPositions.length;
          x = parentCenterX - item.width / 2 + NODE_WIDTH / 2;
        }

        for (let i = 0; i < item.ids.length; i++) {
          const nodeX = x + i * (NODE_WIDTH + SPOUSE_GAP);
          positions.set(item.ids[i], { x: nodeX, y });
        }

        x += item.width + SIBLING_GAP;
      }
    }

    // Second pass: center parents above their children for ancestor generations
    for (const gen of sortedGens) {
      if (gen >= 0) continue;
      const group = genGroups.get(gen) || [];

      for (const id of group) {
        const children = (parentToChildren.get(id) || []).filter(
          cid => generations.has(cid)
        );

        if (children.length > 0) {
          const childPositions = children
            .map(cid => positions.get(cid))
            .filter(Boolean) as Array<{ x: number; y: number }>;

          if (childPositions.length > 0) {
            const centerX = childPositions.reduce((sum, p) => sum + p.x, 0) / childPositions.length;
            const pos = positions.get(id);
            if (pos) {
              // Check if this person has a spouse placed already
              const spouses = (spouseMap.get(id) || []).filter(
                sid => generations.get(sid) === gen && positions.has(sid)
              );

              if (spouses.length > 0) {
                // Position couple centered over child
                const spouseId = spouses[0];
                const offset = (NODE_WIDTH + SPOUSE_GAP) / 2;
                positions.set(id, { x: centerX - offset, y: pos.y });
                positions.set(spouseId, { x: centerX + offset, y: pos.y });
              } else {
                positions.set(id, { x: centerX, y: pos.y });
              }
            }
          }
        }
      }
    }

    // Resolve overlaps within each generation
    for (const gen of sortedGens) {
      const group = genGroups.get(gen) || [];
      const sorted = group
        .map(id => ({ id, pos: positions.get(id)! }))
        .filter(item => item.pos)
        .sort((a, b) => a.pos.x - b.pos.x);

      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        const minGap = NODE_WIDTH + SIBLING_GAP;

        // Check if spouse pair
        const isSpouse = (spouseMap.get(prev.id) || []).includes(curr.id);
        const gap = isSpouse ? NODE_WIDTH + SPOUSE_GAP : minGap;

        if (curr.pos.x - prev.pos.x < gap) {
          const shift = gap - (curr.pos.x - prev.pos.x);
          curr.pos.x += shift;
          positions.set(curr.id, curr.pos);
        }
      }
    }

    // Build layout nodes
    const layoutNodes: LayoutNode[] = nodes
      .filter(node => positions.has(node.id))
      .map(node => ({
        ...node,
        ...positions.get(node.id)!,
      }));

    // Build layout links
    const layoutLinks: LayoutLink[] = links
      .filter(link => positions.has(link.source) && positions.has(link.target))
      .map(link => {
        const sourcePos = positions.get(link.source)!;
        const targetPos = positions.get(link.target)!;
        return {
          ...link,
          sourceX: sourcePos.x,
          sourceY: sourcePos.y,
          targetX: targetPos.x,
          targetY: targetPos.y,
        };
      });

    return { nodes: layoutNodes, links: layoutLinks };
  }, [treeData]);
}
