'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTreeData } from './useTreeData';
import { useTreeLayout } from './useTreeLayout';
import TreeCanvas from './TreeCanvas';
import Header from '../ui/Header';
import Sidebar from '../ui/Sidebar';
import Loading from '../ui/Loading';

const DEFAULT_ROOT = '50'; // First person in the GEDCOM

export default function FamilyTree() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusId = searchParams.get('focus') || DEFAULT_ROOT;

  const { treeData, loading, error, loadTree } = useTreeData();
  const { nodes, links } = useTreeLayout(treeData);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth - (sidebarOpen ? 400 : 0),
        height: window.innerHeight - 56, // header height
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [sidebarOpen]);

  // Load tree when focus changes
  useEffect(() => {
    loadTree(focusId);
  }, [focusId, loadTree]);

  const handleNodeClick = useCallback((id: string) => {
    setSelectedId(id);
    setSidebarOpen(true);
  }, []);

  const handleNodeDoubleClick = useCallback((id: string) => {
    // Focus tree on this person
    router.push(`/?focus=${id}`, { scroll: false });
  }, [router]);

  const handleFocus = useCallback((id: string) => {
    setSidebarOpen(false);
    router.push(`/?focus=${id}`, { scroll: false });
  }, [router]);

  const handleNavigate = useCallback((id: string) => {
    router.push(`/person/${id}`);
  }, [router]);

  const handleSearchSelect = useCallback((id: string) => {
    router.push(`/?focus=${id}`, { scroll: false });
  }, [router]);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
    setSelectedId(null);
  }, []);

  return (
    <div className="h-screen flex flex-col">
      <Header onPersonSelect={handleSearchSelect} />

      <main className="flex-1 pt-14 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-white/50 dark:bg-slate-950/50">
            <Loading message="Chargement de l'arbre..." />
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
              <p className="text-red-600 dark:text-red-400 font-medium">Erreur</p>
              <p className="text-sm text-red-500 mt-1">{error}</p>
              <button
                onClick={() => loadTree(focusId)}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
              >
                Réessayer
              </button>
            </div>
          </div>
        )}

        {!loading && !error && nodes.length > 0 && dimensions.width > 0 && (
          <TreeCanvas
            nodes={nodes}
            links={links}
            rootId={treeData?.rootId || focusId}
            selectedId={selectedId}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
            dimensions={dimensions}
          />
        )}

        {sidebarOpen && (
          <Sidebar
            personId={selectedId}
            onClose={handleCloseSidebar}
            onFocus={handleFocus}
            onNavigate={handleNavigate}
          />
        )}
      </main>
    </div>
  );
}
