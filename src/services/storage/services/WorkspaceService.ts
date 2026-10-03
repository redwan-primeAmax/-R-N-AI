/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../DexieDB';
import { Workspace, Note } from '../../../types';
import { SettingsService } from './SettingsService';
import { DEFAULT_WORKSPACE_ID, DEFAULT_WORKSPACE_NAME, DEFAULT_NOTE_LIMIT } from '../../../constants/defaults';

export interface WorkspaceStats {
  id: string;
  name: string;
  totalNotes: number;
  activeNotes: number;
  trashedNotes: number;
  favoriteNotes: number;
  lockedNotes: number;
  lastUpdated: number;
  isLimitReached: boolean;
}

export interface WorkspaceAppearanceUpdates {
  logoSvg?: string;
  icon?: string;
  color?: string;
  description?: string;
}

class WorkspaceLogicController {
  private workspaceCache: Workspace[] | null = null;
  private activeWorkspaceIdCache: string | null = null;

  /**
   * Clears in-memory workspace cache
   */
  public invalidateCache(): void {
    this.workspaceCache = null;
    this.activeWorkspaceIdCache = null;
  }

  /**
   * Sanitizes workspace name string
   */
  public sanitizeName(name: string, fallback: string = DEFAULT_WORKSPACE_NAME): string {
    if (!name || typeof name !== 'string') return fallback;
    const trimmed = name.trim().replace(/\s+/g, ' ');
    return trimmed.length > 0 ? trimmed : fallback;
  }

  /**
   * Ensures default workspace exists in database
   */
  public async ensureDefaultWorkspace(): Promise<Workspace> {
    try {
      const existingDefault = await db.workspaces.get(DEFAULT_WORKSPACE_ID);
      if (existingDefault) {
        return existingDefault;
      }

      const defaultWorkspace: Workspace = {
        id: DEFAULT_WORKSPACE_ID,
        name: DEFAULT_WORKSPACE_NAME,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        color: '#3b82f6',
        icon: 'briefcase'
      };

      await db.workspaces.put(defaultWorkspace);
      this.invalidateCache();
      return defaultWorkspace;
    } catch (err) {
      console.error('[WorkspaceService] Error ensuring default workspace:', err);
      return {
        id: DEFAULT_WORKSPACE_ID,
        name: DEFAULT_WORKSPACE_NAME,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        color: '#3b82f6',
        icon: 'briefcase'
      };
    }
  }

  /**
   * Fetches all workspaces with fallback and cache handling
   */
  public async getWorkspaces(forceRefresh: boolean = false): Promise<Workspace[]> {
    if (!forceRefresh && this.workspaceCache && this.workspaceCache.length > 0) {
      return this.workspaceCache;
    }

    try {
      let workspaces = await db.workspaces.toArray();

      if (!workspaces || workspaces.length === 0) {
        const defaultWs = await this.ensureDefaultWorkspace();
        workspaces = [defaultWs];
        await this.setActiveWorkspaceId(DEFAULT_WORKSPACE_ID);
      }

      // Sort workspaces: default workspace first, then by createdAt desc
      workspaces.sort((a, b) => {
        if (a.id === DEFAULT_WORKSPACE_ID) return -1;
        if (b.id === DEFAULT_WORKSPACE_ID) return 1;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });

      this.workspaceCache = workspaces;
      return workspaces;
    } catch (err) {
      console.error('[WorkspaceService] Error fetching workspaces:', err);
      return this.workspaceCache || [{
        id: DEFAULT_WORKSPACE_ID,
        name: DEFAULT_WORKSPACE_NAME,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }];
    }
  }

  /**
   * Fetches a single workspace by ID
   */
  public async getWorkspaceById(id: string): Promise<Workspace | null> {
    if (!id) return null;
    try {
      const ws = await db.workspaces.get(id);
      if (ws) return ws;

      if (id === DEFAULT_WORKSPACE_ID) {
        return await this.ensureDefaultWorkspace();
      }
      return null;
    } catch (err) {
      console.error(`[WorkspaceService] Error getting workspace ${id}:`, err);
      return null;
    }
  }

  /**
   * Gets the active workspace ID with auto-repair if deleted/missing
   */
  public async getActiveWorkspaceId(forceRefresh: boolean = false): Promise<string> {
    if (!forceRefresh && this.activeWorkspaceIdCache) {
      return this.activeWorkspaceIdCache;
    }

    try {
      const config = await SettingsService.getSystemConfig();
      let activeId = config?.activeWorkspaceId || DEFAULT_WORKSPACE_ID;

      // Verify active workspace exists
      const allWorkspaces = await this.getWorkspaces(forceRefresh);
      const exists = allWorkspaces.some(w => w.id === activeId);

      if (!exists) {
        activeId = allWorkspaces.length > 0 ? allWorkspaces[0].id : DEFAULT_WORKSPACE_ID;
        await this.setActiveWorkspaceId(activeId);
      }

      this.activeWorkspaceIdCache = activeId;
      return activeId;
    } catch (err) {
      console.error('[WorkspaceService] Error getting active workspace ID:', err);
      return DEFAULT_WORKSPACE_ID;
    }
  }

  /**
   * Sets the active workspace ID and triggers system notifications
   */
  public async setActiveWorkspaceId(id: string): Promise<void> {
    const targetId = id || DEFAULT_WORKSPACE_ID;

    try {
      const config = await SettingsService.getSystemConfig();
      const newConfig = { ...config, activeWorkspaceId: targetId };
      await SettingsService.saveSystemConfig(newConfig);

      this.activeWorkspaceIdCache = targetId;

      // Dispatch global event for active workspace change
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('workspace-notes-changed', {
          detail: { activeWorkspaceId: targetId, timestamp: Date.now() }
        }));
      }
    } catch (err) {
      console.error(`[WorkspaceService] Error setting active workspace ID ${targetId}:`, err);
    }
  }

  /**
   * Returns the complete full object of the currently active workspace
   */
  public async getActiveWorkspace(): Promise<Workspace> {
    const activeId = await this.getActiveWorkspaceId();
    const ws = await this.getWorkspaceById(activeId);
    if (ws) return ws;
    return await this.ensureDefaultWorkspace();
  }

  /**
   * Creates a brand new workspace
   */
  public async createWorkspace(
    name: string,
    logoSvg?: string,
    description?: string,
    icon?: string,
    color?: string
  ): Promise<Workspace> {
    const cleanName = this.sanitizeName(name, 'New Workspace');
    const now = Date.now();

    const newWorkspace: Workspace = {
      id: crypto.randomUUID(),
      name: cleanName,
      createdAt: now,
      updatedAt: now,
      logoSvg: logoSvg ? logoSvg.trim() : undefined,
      description: description ? description.trim() : undefined,
      icon: icon || 'folder',
      color: color || '#3b82f6'
    };

    await db.workspaces.put(newWorkspace);
    this.invalidateCache();
    await this.notifyWorkspaceChanged('create', newWorkspace.id);
    return newWorkspace;
  }

  /**
   * Saves or updates a workspace in database
   */
  public async saveWorkspace(workspace: Workspace): Promise<void> {
    if (!workspace || !workspace.id) {
      throw new Error('Workspace object with valid ID is required');
    }

    const now = Date.now();
    const sanitizedName = this.sanitizeName(
      workspace.name,
      workspace.id === DEFAULT_WORKSPACE_ID ? DEFAULT_WORKSPACE_NAME : 'Untitled Workspace'
    );

    const updatedWorkspace: Workspace = {
      ...workspace,
      name: sanitizedName,
      updatedAt: now,
      createdAt: workspace.createdAt || now
    };

    await db.workspaces.put(updatedWorkspace);
    this.invalidateCache();
    await this.notifyWorkspaceChanged('save', updatedWorkspace.id);
  }

  /**
   * Renames a workspace safely
   */
  public async renameWorkspace(id: string, newName: string): Promise<void> {
    const ws = await this.getWorkspaceById(id);
    if (!ws) throw new Error(`Workspace ${id} not found`);

    const sanitized = this.sanitizeName(newName, ws.name);
    if (sanitized === ws.name) return;

    await this.saveWorkspace({
      ...ws,
      name: sanitized
    });
  }

  /**
   * Updates workspace logo SVG
   */
  public async updateWorkspaceLogo(id: string, logoSvg: string): Promise<void> {
    const ws = await this.getWorkspaceById(id);
    if (!ws) throw new Error(`Workspace ${id} not found`);

    await this.saveWorkspace({
      ...ws,
      logoSvg: logoSvg ? logoSvg.trim() : undefined
    });
  }

  /**
   * Updates workspace appearance (icon, color, logoSvg, description)
   */
  public async updateWorkspaceAppearance(id: string, updates: WorkspaceAppearanceUpdates): Promise<void> {
    const ws = await this.getWorkspaceById(id);
    if (!ws) throw new Error(`Workspace ${id} not found`);

    const updated: Workspace = {
      ...ws,
      updatedAt: Date.now()
    };

    if (updates.logoSvg !== undefined) {
      updated.logoSvg = updates.logoSvg ? updates.logoSvg.trim() : undefined;
    }
    if (updates.icon !== undefined) {
      updated.icon = updates.icon || undefined;
    }
    if (updates.color !== undefined) {
      updated.color = updates.color || undefined;
    }
    if (updates.description !== undefined) {
      updated.description = updates.description ? updates.description.trim() : undefined;
    }

    await db.workspaces.put(updated);
    this.invalidateCache();
    await this.notifyWorkspaceChanged('update-appearance', id);
  }

  /**
   * Safely deletes a workspace and cascades note removal
   */
  public async deleteWorkspace(id: string): Promise<void> {
    if (!id) {
      throw new Error('Workspace ID is required for deletion');
    }

    const allWorkspaces = await this.getWorkspaces(true);
    if (allWorkspaces.length <= 1) {
      throw new Error('Cannot delete the last remaining workspace. At least one workspace must exist.');
    }

    await db.transaction('rw', [db.workspaces, db.notes, db.note_versions, db.deleted_notes], async () => {
      // 1. Remove workspace record
      await db.workspaces.delete(id);

      // 2. Cascade delete all notes belonging to this workspace
      const notesInWorkspace = await db.notes.where('workspaceId').equals(id).toArray();
      const noteIds = notesInWorkspace.map(n => n.id);

      if (noteIds.length > 0) {
        await db.notes.bulkDelete(noteIds);
        await db.note_versions.where('noteId').anyOf(noteIds).delete();

        // Add tombstones for sync safety
        const tombstones = noteIds.map(nid => ({ id: nid, deletedAt: Date.now() }));
        await db.deleted_notes.bulkPut(tombstones);
      }
    });

    this.invalidateCache();

    // Handle active workspace reallocation
    const activeId = await this.getActiveWorkspaceId(true);
    if (activeId === id) {
      const remaining = await db.workspaces.toArray();
      const nextId = remaining.length > 0 ? remaining[0].id : DEFAULT_WORKSPACE_ID;
      await this.setActiveWorkspaceId(nextId);
    }

    await this.notifyWorkspaceChanged('delete', id);
  }

  /**
   * Clears all notes within a workspace without deleting the workspace itself
   */
  public async clearWorkspaceNotes(id: string): Promise<void> {
    if (!id) throw new Error('Workspace ID is required');

    await db.transaction('rw', [db.notes, db.note_versions, db.deleted_notes], async () => {
      const notesInWorkspace = await db.notes.where('workspaceId').equals(id).toArray();
      const noteIds = notesInWorkspace.map(n => n.id);

      if (noteIds.length > 0) {
        await db.notes.bulkDelete(noteIds);
        await db.note_versions.where('noteId').anyOf(noteIds).delete();

        const tombstones = noteIds.map(nid => ({ id: nid, deletedAt: Date.now() }));
        await db.deleted_notes.bulkPut(tombstones);
      }
    });

    await this.notifyWorkspaceChanged('clear-notes', id);
  }

  /**
   * Gets note count breakdown for all workspaces
   */
  public async getNoteCountForWorkspaces(): Promise<Record<string, number>> {
    const workspaces = await this.getWorkspaces();
    const counts: Record<string, number> = {};

    await Promise.all(
      workspaces.map(async (ws) => {
        try {
          const count = await db.notes.where('workspaceId').equals(ws.id).and(n => !n.isTrashed).count();
          counts[ws.id] = count;
        } catch {
          counts[ws.id] = 0;
        }
      })
    );

    return counts;
  }

  /**
   * Retrieves comprehensive statistics for a single workspace
   */
  public async getWorkspaceStats(id: string): Promise<WorkspaceStats> {
    const ws = await this.getWorkspaceById(id);
    if (!ws) {
      throw new Error(`Workspace ${id} not found`);
    }

    const allNotesInWs = await db.notes.where('workspaceId').equals(id).toArray();

    let activeNotes = 0;
    let trashedNotes = 0;
    let favoriteNotes = 0;
    let lockedNotes = 0;
    let maxUpdated = ws.updatedAt || ws.createdAt || 0;

    for (const note of allNotesInWs) {
      if (note.isTrashed) {
        trashedNotes++;
      } else {
        activeNotes++;
        if (note.isFavorite) favoriteNotes++;
        if (note.isLocked) lockedNotes++;
      }
      if (note.updatedAt && note.updatedAt > maxUpdated) {
        maxUpdated = note.updatedAt;
      }
    }

    return {
      id: ws.id,
      name: ws.name,
      totalNotes: allNotesInWs.length,
      activeNotes,
      trashedNotes,
      favoriteNotes,
      lockedNotes,
      lastUpdated: maxUpdated,
      isLimitReached: activeNotes >= DEFAULT_NOTE_LIMIT
    };
  }

  /**
   * Checks whether workspace has reached the note capacity limit
   */
  public async checkWorkspaceLimit(id: string, maxLimit: number = DEFAULT_NOTE_LIMIT): Promise<{
    count: number;
    maxLimit: number;
    isLimitReached: boolean;
  }> {
    const count = await db.notes.where('workspaceId').equals(id).and(n => !n.isTrashed).count();
    return {
      count,
      maxLimit,
      isLimitReached: count >= maxLimit
    };
  }

  /**
   * Duplicates an entire workspace along with all non-trashed notes
   */
  public async duplicateWorkspace(id: string, newName?: string): Promise<Workspace> {
    const sourceWs = await this.getWorkspaceById(id);
    if (!sourceWs) {
      throw new Error(`Source workspace ${id} not found`);
    }

    const targetName = this.sanitizeName(newName || `${sourceWs.name} (Copy)`);
    const newWs = await this.createWorkspace(
      targetName,
      sourceWs.logoSvg,
      sourceWs.description,
      sourceWs.icon,
      sourceWs.color
    );

    const sourceNotes = await db.notes.where('workspaceId').equals(id).and(n => !n.isTrashed).toArray();

    if (sourceNotes.length > 0) {
      const now = Date.now();
      const idMap = new Map<string, string>();

      // Generate new IDs
      sourceNotes.forEach(n => {
        idMap.set(n.id, crypto.randomUUID());
      });

      const clonedNotes: Note[] = sourceNotes.map(n => ({
        ...n,
        id: idMap.get(n.id)!,
        workspaceId: newWs.id,
        parentId: n.parentId && idMap.has(n.parentId) ? idMap.get(n.parentId) : undefined,
        createdAt: now,
        updatedAt: now
      }));

      await db.notes.bulkPut(clonedNotes);
    }

    this.invalidateCache();
    await this.notifyWorkspaceChanged('duplicate', newWs.id);
    return newWs;
  }

  /**
   * Exports all notes of a workspace as a clean JSON backup
   */
  public async exportWorkspaceAsJson(id: string): Promise<string> {
    const ws = await this.getWorkspaceById(id);
    if (!ws) throw new Error(`Workspace ${id} not found`);

    const notes = await db.notes.where('workspaceId').equals(id).toArray();
    const payload = {
      workspace: ws,
      notes,
      exportedAt: new Date().toISOString(),
      appVersion: '2.0.0'
    };

    return JSON.stringify(payload, null, 2);
  }

  /**
   * Private notification dispatcher for workspace state changes
   */
  private async notifyWorkspaceChanged(action: string, workspaceId: string): Promise<void> {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('workspace-notes-changed', {
        detail: { action, workspaceId, timestamp: Date.now() }
      }));
    }
  }
}

export const WorkspaceService = new WorkspaceLogicController();
