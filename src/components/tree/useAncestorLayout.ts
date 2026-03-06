'use client';

import { useMemo } from 'react';
import type { TreeData, TreeNode } from '@/lib/types';

export interface AncestorNode {
  id: string;
  displayName: string;
  sex: 'M' | 'F' | 'U';
  birthYear?: string;
  deathYear?: string;
  occupation?: string;
  ahnen: number;   // 1=root, 2=father, 3=mother, 4=pat-GF, 5=pat-GM…
  gen: number;     // 0=root, 1=parents, 2=grandparents…
  posInGen: number;// left-to-right index within generation
}

export function useAncestorLayout(treeData: TreeData | null): AncestorNode[] {
  return useMemo(() => {
    if (!treeData) return [];

    const { rootId, nodes, links } = treeData;
    const nodeMap = new Map<string, TreeNode>(nodes.map(n => [n.id, n]));

    // parent link: source = parent, target = child
    const childToParents = new Map<string, string[]>();
    for (const link of links) {
      if (link.type === 'parent') {
        const arr = childToParents.get(link.target) || [];
        arr.push(link.source);
        childToParents.set(link.target, arr);
      }
    }

    const result: AncestorNode[] = [];
    const visited = new Set<string>();
    const queue: Array<{ id: string; ahnen: number }> = [{ id: rootId, ahnen: 1 }];

    while (queue.length > 0) {
      const { id, ahnen } = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);

      const node = nodeMap.get(id);
      if (!node) continue;

      const gen = Math.floor(Math.log2(ahnen));
      const posInGen = ahnen - Math.pow(2, gen);

      result.push({
        id,
        displayName: node.displayName,
        sex: node.sex,
        birthYear: node.birthYear,
        deathYear: node.deathYear,
        occupation: node.occupation,
        ahnen,
        gen,
        posInGen,
      });

      const parents = childToParents.get(id) || [];
      // Determine who is father (even) and mother (odd) by sex
      const father =
        parents.find(pid => nodeMap.get(pid)?.sex === 'M') ??
        (parents.length > 0 ? parents[0] : undefined);
      const mother =
        parents.find(pid => nodeMap.get(pid)?.sex === 'F') ??
        parents.find(pid => pid !== father);

      if (father && !visited.has(father)) {
        queue.push({ id: father, ahnen: 2 * ahnen });
      }
      if (mother && mother !== father && !visited.has(mother)) {
        queue.push({ id: mother, ahnen: 2 * ahnen + 1 });
      }
    }

    return result.sort((a, b) => a.ahnen - b.ahnen);
  }, [treeData]);
}
