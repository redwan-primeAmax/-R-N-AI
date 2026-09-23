/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Note, Workspace, AISettings } from '../../types';
import { NoteService } from './services/NoteService';
import { WorkspaceService } from './services/WorkspaceService';
import { SettingsService } from './services/SettingsService';

type StoreListener = () => void;

interface AppState {
  notes: Note[];
  workspaces: Workspace[];
  activeWorkspaceId: string;
  aiSettings: AISettings | null;
  loading: boolean;
  version: number;
}

let state: AppState = {
  notes: [],
  workspaces: [],
  activeWorkspaceId: 'default',
  aiSettings: null,
  loading: true,
  version: 0
};

const listeners = new Set<StoreListener>();

function notify() {
  state.version++;
  listeners.forEach(fn => fn());
}

export const AppStore = {
  getState(): AppState {
    return state;
  },

  subscribe(listener: StoreListener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  async reloadNotes(force: boolean = true) {
    try {
      const notes = await NoteService.getAllNotes(force);
      state.notes = notes;
      notify();
    } catch (e) {
      console.error('AppStore: Failed to reload notes:', e);
    }
  },

  async reloadWorkspaces() {
    try {
      const workspaces = await WorkspaceService.getWorkspaces();
      const activeWorkspaceId = await WorkspaceService.getActiveWorkspaceId();
      state.workspaces = workspaces;
      state.activeWorkspaceId = activeWorkspaceId;
      notify();
    } catch (e) {
      console.error('AppStore: Failed to reload workspaces:', e);
    }
  },

  async initialize() {
    state.loading = true;
    notify();

    try {
      const [workspaces, activeWsId, notes, settings] = await Promise.all([
        WorkspaceService.getWorkspaces(),
        WorkspaceService.getActiveWorkspaceId(),
        NoteService.getAllNotes(),
        SettingsService.getAISettings()
      ]);

      state.workspaces = workspaces;
      state.activeWorkspaceId = activeWsId;
      state.notes = notes;
      state.aiSettings = settings;
    } catch (e) {
      console.error('AppStore initialization error:', e);
    } finally {
      state.loading = false;
      notify();
    }
  },

  async switchWorkspace(workspaceId: string) {
    await WorkspaceService.setActiveWorkspaceId(workspaceId);
    state.activeWorkspaceId = workspaceId;
    NoteService.invalidateCache();
    await this.reloadNotes(true);
  }
};

/**
 * React hook for subscribing to centralized store state changes
 */
export function useAppStore() {
  const [appState, setAppState] = useState<AppState>(AppStore.getState());

  useEffect(() => {
    const unsubscribe = AppStore.subscribe(() => {
      setAppState({ ...AppStore.getState() });
    });

    if (AppStore.getState().loading) {
      AppStore.initialize();
    }

    return unsubscribe;
  }, []);

  return {
    ...appState,
    reloadNotes: AppStore.reloadNotes.bind(AppStore),
    reloadWorkspaces: AppStore.reloadWorkspaces.bind(AppStore),
    switchWorkspace: AppStore.switchWorkspace.bind(AppStore)
  };
}
