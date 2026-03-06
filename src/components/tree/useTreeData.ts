'use client';

import { useState, useCallback } from 'react';
import type { TreeData } from '@/lib/types';

export function useTreeData() {
  const [treeData, setTreeData] = useState<TreeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // personId = null → load the full tree (all persons)
  const loadTree = useCallback(async (personId: string | null) => {
    setLoading(true);
    setError(null);

    try {
      const url = personId ? `/api/tree/${personId}` : '/api/tree';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load tree');
      const data: TreeData = await res.json();
      setTreeData(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { treeData, loading, error, loadTree };
}
