'use client';

import { useState, useCallback } from 'react';
import type { TreeData } from '@/lib/types';

export function useTreeData() {
  const [treeData, setTreeData] = useState<TreeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTree = useCallback(async (personId: string, mode: 'full' | 'ancestors' | 'descendants' = 'full') => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tree/${personId}?mode=${mode}`);
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
