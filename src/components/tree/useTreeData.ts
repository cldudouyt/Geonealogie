'use client';

import { useState, useCallback, useRef } from 'react';
import type { TreeData } from '@/lib/types';

export function useTreeData() {
  const [treeData, setTreeData] = useState<TreeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadTree = useCallback(async (personId: string, mode: 'full' | 'ancestors' | 'descendants' = 'full') => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tree/${personId}?mode=${mode}`, { signal });
      if (!res.ok) throw new Error('Failed to load tree');
      const data: TreeData = await res.json();
      setTreeData(data);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError((err as Error).message);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, []);

  return { treeData, loading, error, loadTree };
}
