'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTreeData } from './useTreeData';
import { useTreeLayout } from './useTreeLayout';
import TreeCanvas from './TreeCanvas';
import HorizontalTree from './HorizontalTree';
import FanChart from './FanChart';
import WheelChart from './WheelChart';
import AhnentafelView from './AhnentafelView';
import ViewSelector, { type ViewMode } from './ViewSelector';
import Header from '../ui/Header';
import Sidebar from '../ui/Sidebar';
import Loading from '../ui/Loading';

export default function FamilyTree({ defaultRootId }: { defaultRootId?: string }) {
  useEffect(() => {
    document.body.classList.add('tree-page');
    return () => document.body.classList.remove('tree-page');
  }, []);

  const router = useRouter();
  const searchParams = useSearchParams();
  const focusId = searchParams.get('focus') || defaultRootId || '';
  const viewMode = (searchParams.get('view') as ViewMode) || 'tree';

  const { treeData, loading, error, loadTree } = useTreeData();
  const { nodes, links } = useTreeLayout(treeData);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth - (sidebarOpen ? 400 : 0),
        height: window.innerHeight - 56,
      });
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [sidebarOpen]);

  useEffect(() => {
    loadTree(focusId);
  }, [focusId, loadTree]);

  const handleNodeClick = useCallback((id: string) => {
    setSelectedId(id);
    setSidebarOpen(true);
  }, []);

  const handleNodeDoubleClick = useCallback((id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('focus', id);
    router.push(`/?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handleFocus = useCallback((id: string) => {
    setSidebarOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set('focus', id);
    router.push(`/?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handleNavigate = useCallback((id: string) => {
    router.push(`/person/${id}`);
  }, [router]);

  const handleSearchSelect = useCallback((id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('focus', id);
    router.push(`/?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
    setSelectedId(null);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCloseSidebar();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleCloseSidebar]);

  const rootId = treeData?.rootId || focusId;
  const ready = !loading && !error && dimensions.width > 0;

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

        {/* Sélecteur de vue */}
        {!loading && !error && treeData && (
          <ViewSelector current={viewMode} />
        )}

        {/* Arbre vertical (défaut) */}
        {ready && treeData && viewMode === 'tree' && nodes.length > 0 && (
          <TreeCanvas
            nodes={nodes}
            links={links}
            rootId={rootId}
            selectedId={selectedId}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
            dimensions={dimensions}
          />
        )}

        {/* Arbre horizontal */}
        {ready && treeData && viewMode === 'horizontal' && nodes.length > 0 && (
          <HorizontalTree
            treeData={treeData}
            selectedId={selectedId}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
            dimensions={dimensions}
          />
        )}

        {/* Éventail demi-cercle */}
        {ready && treeData && viewMode === 'fan' && (
          <FanChart
            treeData={treeData}
            selectedId={selectedId}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
            dimensions={dimensions}
          />
        )}

        {/* Roue généalogique 360° */}
        {ready && treeData && viewMode === 'wheel' && (
          <WheelChart
            treeData={treeData}
            selectedId={selectedId}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
            dimensions={dimensions}
          />
        )}

        {/* Liste Ahnentafel */}
        {ready && treeData && viewMode === 'ahnentafel' && (
          <AhnentafelView
            treeData={treeData}
            selectedId={selectedId}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
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
