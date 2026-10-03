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
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('default');
  const [workspaceNoteCounts, setWorkspaceNoteCounts] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);

  // Creation State
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceColor, setNewWorkspaceColor] = useState('#3b82f6');
  const [newWorkspaceIcon, setNewWorkspaceIcon] = useState('folder');

  // Edit / Rename State
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [editName, setEditName] = useState('');

  // Modals & Action Confirmation States
  const [workspaceToDelete, setWorkspaceToDelete] = useState<string | null>(null);
  const [workspaceToClear, setWorkspaceToClear] = useState<string | null>(null);
  const [workspaceForLogo, setWorkspaceForLogo] = useState<Workspace | null>(null);
  const [workspaceSettingsModal, setWorkspaceSettingsModal] = useState<Workspace | null>(null);
  const [showLimitNoticeModal, setShowLimitNoticeModal] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const origin = (location.state as any)?.from || 'direct';

  /**
   * First-time limit notice reminder
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
   * Filtered list of workspaces based on search query
   */
  const filteredWorkspaces = useMemo(() => {
    if (!searchQuery.trim()) return workspaces;
    const q = searchQuery.toLowerCase().trim();
    return workspaces.filter(w => 
      w.name.toLowerCase().includes(q) || 
      (w.description && w.description.toLowerCase().includes(q))
    );
  }, [workspaces, searchQuery]);

  /**
   * Handles creating a new workspace and auto-switching to it
   */
  const handleCreate = useCallback(async () => {
    const trimmed = newWorkspaceName.trim();
    if (!trimmed) return;

    try {
      setIsLoading(true);
      const newWs = await DataManager.createWorkspace(
        trimmed,
        undefined,
        undefined,
        newWorkspaceIcon,
        newWorkspaceColor
      );

      setNewWorkspaceName('');
      setIsCreating(false);

      window.dispatchEvent(new CustomEvent('app-notification', {
        detail: { message: `নতুন ওয়ার্কস্পেস তৈরি হয়েছে "${newWs.name}"`, type: 'success' }
      }));

      // Auto-switch to newly created workspace
      await handleSwitch(newWs.id);
    } catch (err: any) {
      console.error('[useWorkspaceLogic] Workspace creation failed:', err);
      window.dispatchEvent(new CustomEvent('app-notification', {
        detail: { message: err?.message || 'ওয়ার্কস্পেস তৈরি ব্যর্থ হয়েছে', type: 'error' }
      }));
    } finally {
      setIsLoading(false);
    }
  }, [newWorkspaceName, newWorkspaceIcon, newWorkspaceColor]);

  /**
   * Handles renaming an existing workspace
   */
  const handleRename = useCallback(async () => {
    if (!editingWorkspace || !editName.trim()) return;

    try {
      const clean = editName.trim();
      await DataManager.renameWorkspace(editingWorkspace.id, clean);
      setEditingWorkspace(null);
      setEditName('');
      await loadData();

      window.dispatchEvent(new CustomEvent('app-notification', {
        detail: { message: `ওয়ার্কস্পেসের নাম পরিবর্তন করা হয়েছে`, type: 'success' }
      }));
    } catch (err: any) {
      console.error('[useWorkspaceLogic] Workspace rename failed:', err);
      window.dispatchEvent(new CustomEvent('app-notification', {
        detail: { message: err?.message || 'নাম পরিবর্তন ব্যর্থ হয়েছে', type: 'error' }
      }));
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

      window.dispatchEvent(new CustomEvent('app-notification', {
        detail: { message: 'ওয়ার্কস্পেস মুছে ফেলা হয়েছে', type: 'info' }
      }));
    } catch (err: any) {
      console.error('[useWorkspaceLogic] Workspace delete failed:', err);
      window.dispatchEvent(new CustomEvent('app-notification', {
        detail: { message: err?.message || 'ওয়ার্কস্পেস ডিলিট করা যায়নি', type: 'error' }
      }));
    } finally {
      setIsLoading(false);
    }
  }, [workspaceToDelete, loadData]);

  /**
   * Handles clearing all notes in a workspace
   */
  const handleClearNotes = useCallback(async () => {
    if (!workspaceToClear) return;

    try {
      const targetId = workspaceToClear;
      setWorkspaceToClear(null);
      setIsLoading(true);

      await DataManager.clearWorkspaceNotes(targetId);
      await loadData();

      window.dispatchEvent(new CustomEvent('app-notification', {
        detail: { message: 'ওয়ার্কস্পেসের সব নোট মুছে ফেলা হয়েছে', type: 'info' }
      }));
    } catch (err: any) {
      console.error('[useWorkspaceLogic] Clear notes failed:', err);
      window.dispatchEvent(new CustomEvent('app-notification', {
        detail: { message: err?.message || 'নোট মুছতে সমস্যা হয়েছে', type: 'error' }
      }));
    } finally {
      setIsLoading(false);
    }
  }, [workspaceToClear, loadData]);

  /**
   * Handles duplicating a workspace
   */
  const handleDuplicate = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      const duplicated = await DataManager.duplicateWorkspace(id);
      await loadData();

      window.dispatchEvent(new CustomEvent('app-notification', {
        detail: { message: `ওয়ার্কস্পেস ক্লোন করা হয়েছে: "${duplicated.name}"`, type: 'success' }
      }));
    } catch (err: any) {
      console.error('[useWorkspaceLogic] Duplicate failed:', err);
      window.dispatchEvent(new CustomEvent('app-notification', {
        detail: { message: err?.message || 'ওয়ার্কস্পেস ডুপ্লিকেট করা যায়নি', type: 'error' }
      }));
    } finally {
      setIsLoading(false);
    }
  }, [loadData]);

  /**
   * Handles switching the current active workspace
   */
  const handleSwitch = useCallback(async (id: string) => {
    if (!id || id === activeWorkspaceId) {
      navigate('/main');
      return;
    }

    try {
      setIsSwitching(true);
      await new Promise(resolve => setTimeout(resolve, 200));
      await DataManager.setActiveWorkspaceId(id);
      setActiveWorkspaceId(id);
      setIsSwitching(false);

      // Navigate to main page
      navigate('/main');
    } catch (err) {
      console.error('[useWorkspaceLogic] Workspace switch failed:', err);
      setIsSwitching(false);
    }
  }, [activeWorkspaceId, navigate]);

  /**
   * Handles updating workspace appearance (icon, color, logoSvg)
   */
  const handleUpdateAppearance = useCallback(async (data: { logoSvg?: string; icon?: string; color?: string }) => {
    if (!workspaceForLogo) return;

    try {
      await DataManager.updateWorkspaceAppearance(workspaceForLogo.id, data);
      setWorkspaceForLogo(null);
      await loadData();

      window.dispatchEvent(new CustomEvent('app-notification', {
        detail: { message: 'ওয়ার্কস্পেস কাস্টমাইজেশন সংরক্ষিত হয়েছে', type: 'success' }
      }));
    } catch (err) {
      console.error('[useWorkspaceLogic] Workspace appearance update failed:', err);
    }
  }, [workspaceForLogo, loadData]);

  /**
   * Exports a workspace as a JSON file
   */
  const handleExportJson = useCallback(async (id: string) => {
    try {
      const jsonStr = await DataManager.exportWorkspaceAsJson(id);
      const ws = workspaces.find(w => w.id === id);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workspace-${(ws?.name || 'notes').toLowerCase().replace(/\s+/g, '_')}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      window.dispatchEvent(new CustomEvent('app-notification', {
        detail: { message: 'ওয়ার্কস্পেস ব্যাকআপ ডাউনলোড শুরু হয়েছে', type: 'success' }
      }));
    } catch (err) {
      console.error('[useWorkspaceLogic] Export failed:', err);
    }
  }, [workspaces]);

  return {
    // State
    workspaces,
    filteredWorkspaces,
    activeWorkspaceId,
    workspaceNoteCounts,
    searchQuery,
    isLoading,
    isCreating,
    newWorkspaceName,
    newWorkspaceColor,
    newWorkspaceIcon,
    editingWorkspace,
    editName,
    isSwitching,
    workspaceToDelete,
    workspaceToClear,
    workspaceForLogo,
    workspaceSettingsModal,
    showLimitNoticeModal,
    origin,

    // Setters
    setSearchQuery,
    setIsCreating,
    setNewWorkspaceName,
    setNewWorkspaceColor,
    setNewWorkspaceIcon,
    setEditingWorkspace,
    setEditName,
    setWorkspaceToDelete,
    setWorkspaceToClear,
    setWorkspaceForLogo,
    setWorkspaceSettingsModal,
    setShowLimitNoticeModal,

    // Handlers
    handleDismissLimitNotice,
    handleCreate,
    handleRename,
    handleDelete,
    handleClearNotes,
    handleDuplicate,
    handleExportJson,
    handleSwitch,
    handleUpdateAppearance,
    navigate
  };
}
