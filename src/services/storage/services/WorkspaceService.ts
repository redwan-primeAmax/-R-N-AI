/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../DexieDB';
import { Workspace } from '../../../types';
import { SettingsService } from './SettingsService';

export const WorkspaceService = {
  async getWorkspaces(): Promise<Workspace[]> {
    let workspaces = await db.workspaces.toArray();

    if (!workspaces || workspaces.length === 0) {
      const defaultWorkspace: Workspace = {
        id: 'default',
        name: 'Default Workspace',
        createdAt: Date.now()
      };
      workspaces = [defaultWorkspace];
      await db.workspaces.put(defaultWorkspace);
      await this.setActiveWorkspaceId('default');
    }
    return workspaces;
  },

  async getActiveWorkspaceId(): Promise<string> {
    const config = await SettingsService.getSystemConfig();
    return config?.activeWorkspaceId || 'default';
  },

  async setActiveWorkspaceId(id: string): Promise<void> {
    const config = await SettingsService.getSystemConfig();
    const newConfig = { ...config, activeWorkspaceId: id };
    await SettingsService.saveSystemConfig(newConfig);
  },

  async saveWorkspace(workspace: Workspace): Promise<void> {
    workspace.updatedAt = Date.now();
    await db.workspaces.put(workspace);
  },

  async deleteWorkspace(id: string): Promise<void> {
    await db.transaction('rw', [db.workspaces, db.notes, db.note_versions], async () => {
      await db.workspaces.delete(id);

      const notesToDelete = await db.notes.where('workspaceId').equals(id).toArray();
      const noteIdsToDelete = notesToDelete.map(n => n.id);
      if (noteIdsToDelete.length > 0) {
        await db.notes.bulkDelete(noteIdsToDelete);
        await db.note_versions.where('noteId').anyOf(noteIdsToDelete).delete();
      }
    });

    const remaining = await db.workspaces.toArray();
    const currentId = await this.getActiveWorkspaceId();
    if (currentId === id) {
      if (remaining.length > 0) {
        await this.setActiveWorkspaceId(remaining[0].id);
      } else {
        await this.setActiveWorkspaceId('default');
      }
    }
  },

  async getNoteCountForWorkspaces(): Promise<Record<string, number>> {
    const ws = await this.getWorkspaces();
    const counts: Record<string, number> = {};
    for (const w of ws) {
      counts[w.id] = await db.notes.where('workspaceId').equals(w.id).count();
    }
    return counts;
  }
};
