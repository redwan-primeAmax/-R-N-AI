/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DataManager } from '../../services/storage/DataManager';
import { Workspace } from '../../types';

export function useWorkspaceLogic() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('');
  const [workspaceNoteCounts, setWorkspaceNoteCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [editName, setEditName] = useState('');
  const [isSwitching, setIsSwitching] = useState(false);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<string | null>(null);
  const [workspaceForLogo, setWorkspaceForLogo] = useState<Workspace | null>(null);
  const [workspaceSettingsModal, setWorkspaceSettingsModal] = useState<Workspace | null>(null);
  const [showLimitNoticeModal, setShowLimitNoticeModal] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const origin = (location.state as any)?.from || 'direct';

  // Animation variants memoization
  const animationVariants = useMemo(() => ({
    header: {
      top: { initial: { y: '-100%' }, animate: { y: 0 } },
      bottom: { initial: { y: '100%' }, animate: { y: 0 } }
    },
    sidebar: {
      topLeft: { initial: { x: '-100%', y: '-100%' }, animate: { x: 0, y: 0 } },
      bottomRight: { initial: { x: '100%', y: '100%' }, animate: { x: 0, y: 0 } }
    }
  }), []);

  /**
   * Check first-time limit notice dialog state
   */
  useEffect(() => {
    const hasSeenNotice = localStorage.getItem('seen_workspace_limit_notice');
    if (!hasSeenNotice) {
      setShowLimitNoticeModal(true);
    }
  }, []);

  const handleDismissLimitNotice = useCallback(() => {
    localStorage.setItem('seen_workspace_limit_notice', 'true');
    setShowLimitNoticeModal(false);
  }, []);

  /**
   * Asynchronously loads workspaces, active workspace ID, and note counts
   */
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [ws, activeId, counts] = await Promise.all([
        DataManager.getWorkspaces(true),
        DataManager.getActiveWorkspaceId(true),
        DataManager.getNoteCountForWorkspaces()
      ]);

      setWorkspaces(ws || []);
      setActiveWorkspaceId(activeId || 'default');
      setWorkspaceNoteCounts(counts || {});
    } catch (e) {
      console.error('[useWorkspaceLogic] Data loading failed:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Event listener subscription for workspace and note changes
   */
  useEffect(() => {
    loadData();
    const handleWorkspaceNotesChanged = () => {
      loadData();
    };

    window.addEventListener('workspace-notes-changed', handleWorkspaceNotesChanged);
    window.addEventListener('sync', handleWorkspaceNotesChanged);

    return () => {
      window.removeEventListener('workspace-notes-changed', handleWorkspaceNotesChanged);
      window.removeEventListener('sync', handleWorkspaceNotesChanged);
    };
  }, [loadData]);

  /**
   * Handles creating a new workspace and auto-switching to it
   */
  const handleCreate = useCallback(async () => {
    const trimmed = newWorkspaceName.trim();
    if (!trimmed) return;

    try {
      setIsLoading(true);
      const newWs = await DataManager.createWorkspace(trimmed);
      setNewWorkspaceName('');
      setIsCreating(false);

      // Auto-switch to newly created workspace
      await handleSwitch(newWs.id);
    } catch (err) {
      console.error('[useWorkspaceLogic] Workspace creation failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [newWorkspaceName]);

  /**
   * Handles renaming an existing workspace
   */
  const handleRename = useCallback(async () => {
    if (!editingWorkspace || !editName.trim()) return;

    try {
      await DataManager.renameWorkspace(editingWorkspace.id, editName.trim());
      setEditingWorkspace(null);
      setEditName('');
      await loadData();
    } catch (err) {
      console.error('[useWorkspaceLogic] Workspace rename failed:', err);
    }
  }, [editingWorkspace, editName, loadData]);

  /**
   * Handles deleting a workspace with cascade note removal
   */
  const handleDelete = useCallback(async () => {
    if (!workspaceToDelete) return;

    try {
      const idToDelete = workspaceToDelete;
      setWorkspaceToDelete(null);
      setIsLoading(true);

      await DataManager.deleteWorkspace(idToDelete);
      await loadData();
    } catch (err) {
      console.error('[useWorkspaceLogic] Workspace delete failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceToDelete, loadData]);

  /**
   * Handles switching the current active workspace
   */
  const handleSwitch = useCallback(async (id: string) => {
    if (!id) return;

    try {
      setIsSwitching(true);
      // Smooth loading transition
      await new Promise(resolve => setTimeout(resolve, 300));
      await DataManager.setActiveWorkspaceId(id);
      setActiveWorkspaceId(id);
      setIsSwitching(false);

      // Always navigate to main page after switching
      navigate('/main');
    } catch (err) {
      console.error('[useWorkspaceLogic] Workspace switch failed:', err);
      setIsSwitching(false);
    }
  }, [navigate]);

  /**
   * Handles updating the workspace SVG logo
   */
  const handleUpdateLogo = useCallback(async (svg: string) => {
    if (!workspaceForLogo) return;

    try {
      await DataManager.updateWorkspaceLogo(workspaceForLogo.id, svg);
      setWorkspaceForLogo(null);
      await loadData();
    } catch (err) {
      console.error('[useWorkspaceLogic] Workspace logo update failed:', err);
    }
  }, [workspaceForLogo, loadData]);

  return {
    // State
    workspaces,
    activeWorkspaceId,
    workspaceNoteCounts,
    isLoading,
    isCreating,
    newWorkspaceName,
    editingWorkspace,
    editName,
    isSwitching,
    workspaceToDelete,
    workspaceForLogo,
    workspaceSettingsModal,
    showLimitNoticeModal,
    origin,
    animationVariants,

    // Setters
    setIsCreating,
    setNewWorkspaceName,
    setEditingWorkspace,
    setEditName,
    setWorkspaceToDelete,
    setWorkspaceForLogo,
    setWorkspaceSettingsModal,

    // Handlers
    handleDismissLimitNotice,
    handleCreate,
    handleRename,
    handleDelete,
    handleSwitch,
    handleUpdateLogo,
    navigate
  };
}
