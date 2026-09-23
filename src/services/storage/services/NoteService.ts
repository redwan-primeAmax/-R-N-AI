/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../DexieDB';
import { Note, NoteVersion, BookmarkFolder } from '../../../types';
import { WorkspaceService } from './WorkspaceService';
import { MediaService } from './MediaService';
import { SettingsService } from './SettingsService';
import { HistoryManager } from '../HistoryManager';

let cachedNotes: Note[] | null = null;
let cachedWorkspaceId: string | null = null;

export const NoteService = {
  invalidateCache() {
    cachedNotes = null;
    cachedWorkspaceId = null;
  },

  async getAllNotes(forceRefresh: boolean = false): Promise<Note[]> {
    const currentWorkspaceId = await WorkspaceService.getActiveWorkspaceId();
    if (!forceRefresh && cachedNotes !== null && cachedWorkspaceId === currentWorkspaceId) {
      return cachedNotes;
    }

    const notes = await db.notes.where('workspaceId').equals(currentWorkspaceId).toArray();
    cachedNotes = notes;
    cachedWorkspaceId = currentWorkspaceId;
    return notes;
  },

  async getNotesPaginated(page: number, pageSize: number): Promise<{ notes: Note[]; hasMore: boolean }> {
    const currentWorkspaceId = await WorkspaceService.getActiveWorkspaceId();
    const start = page * pageSize;

    const paginatedNotes = await db.notes
      .where('workspaceId')
      .equals(currentWorkspaceId)
      .reverse()
      .offset(start)
      .limit(pageSize)
      .toArray();

    const totalNotes = await db.notes.where('workspaceId').equals(currentWorkspaceId).count();
    return {
      notes: paginatedNotes,
      hasMore: start + pageSize < totalNotes
    };
  },

  /**
   * Optimized getNoteById (Issue 9 fix: pure read without redundant history/cache mutations)
   */
  async getNoteById(id: string, recordHistory: boolean = false): Promise<Note | null> {
    const note = await db.notes.get(id);
    if (note && recordHistory) {
      db.notes.update(id, { lastOpenedAt: Date.now() }).catch(() => {});
      HistoryManager.addNoteToHistory({
        id: note.id,
        title: note.title || 'Untitled',
        emoji: note.emoji || ''
      }).catch(() => {});
    }
    return note || null;
  },

  async wasPermanentlyDeleted(id: string): Promise<boolean> {
    const record = await db.deleted_notes.get(id);
    return !!record;
  },

  async createNote(workspaceId?: string, parentId?: string): Promise<Note> {
    const wsId = workspaceId || await WorkspaceService.getActiveWorkspaceId();
    const config = await SettingsService.getSystemConfig();
    const maxLimit = config?.noteLimitPerWorkspace || 10000;

    const totalNotes = await db.notes.where('workspaceId').equals(wsId).count();
    if (totalNotes >= maxLimit) {
      throw new Error(`Workspace Note Limit Reached (Max ${maxLimit})! Please switch or create a new workspace.`);
    }

    const newNote: Note = {
      id: crypto.randomUUID(),
      title: '',
      content: '',
      emoji: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      workspaceId: wsId,
      parentId,
      isTrashed: false,
      isFavorite: false,
      isLocked: false,
      tags: []
    };

    return await this.saveNote(newNote);
  },

  async saveNote(note: Note): Promise<Note> {
    const currentWorkspaceId = await WorkspaceService.getActiveWorkspaceId();
    if (!note.workspaceId) {
      note.workspaceId = currentWorkspaceId;
    }
    const wsId = note.workspaceId;

    // Tombstone protection
    const isDeleted = await this.wasPermanentlyDeleted(note.id);
    if (isDeleted) {
      console.warn(`NoteService: Blocking re-creation of permanently deleted note ${note.id}`);
      return note;
    }

    const processedContent = await MediaService.extractMediaFromContent(note.content);
    const now = Date.now();

    return await db.transaction('rw', [db.notes, db.deleted_notes, db.key_value_pairs], async () => {
      const existing = await db.notes.get(note.id);
      const isNew = !existing;

      const config = await SettingsService.getSystemConfig();
      const maxLimit = config?.noteLimitPerWorkspace || 10000;

      const notesCountInWorkspace = await db.notes.where('workspaceId').equals(wsId).count();
      if (isNew && notesCountInWorkspace >= maxLimit) {
        throw new Error(`Workspace Note Limit Reached (Max ${maxLimit})! Note creation blocked.`);
      }

      if (isNew) {
        let finalTitle = note.title;
        if (!finalTitle || !finalTitle.trim()) {
          finalTitle = 'Untitled';
        }
        let counter = 1;

        const findDuplicate = async (title: string) => {
          return await db.notes
            .where('workspaceId')
            .equals(wsId)
            .and(n => n.title.toLowerCase() === title.toLowerCase())
            .first();
        };

        while (await findDuplicate(finalTitle)) {
          finalTitle = `${note.title || 'Untitled'} (${counter})`;
          counter++;
        }
        note.title = finalTitle;
      }

      const updatedNote: Note = {
        ...note,
        content: processedContent,
        updatedAt: now,
        createdAt: isNew ? now : (existing?.createdAt || now)
      };

      await db.notes.put(updatedNote);
      this.invalidateCache();

      return updatedNote;
    });
  },

  async updateNote(id: string, updates: Partial<Note>): Promise<void> {
    const note = await db.notes.get(id);
    if (!note) return;
    const now = Date.now();
    await db.notes.update(id, { ...updates, updatedAt: now });
    this.invalidateCache();
  },

  async duplicateNote(id: string): Promise<Note | null> {
    const noteToDuplicate = await db.notes.get(id);
    if (noteToDuplicate) {
      const duplicatedNote: Note = {
        ...noteToDuplicate,
        id: `copy-${Date.now()}`,
        title: `${noteToDuplicate.title} (Copy)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await db.notes.put(duplicatedNote);
      this.invalidateCache();
      return duplicatedNote;
    }
    return null;
  },

  async deleteNote(id: string): Promise<void> {
    const now = Date.now();
    await db.notes.update(id, { isTrashed: true, updatedAt: now });
    this.invalidateCache();

    // Clean local backups
    const prefix = `note_backup_${id}`;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) keysToRemove.push(key);
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  },

  async deleteNotePermanent(id: string): Promise<void> {
    await db.transaction('rw', [db.notes, db.note_versions, db.key_value_pairs, db.deleted_notes], async () => {
      await db.notes.delete(id);
      await db.note_versions.where('noteId').equals(id).delete();
      await db.deleted_notes.put({ id, deletedAt: Date.now() });

      const hist = await db.key_value_pairs.get('recent_notes_history');
      if (hist?.value) {
        const updated = hist.value.filter((r: any) => r.id !== id);
        await db.key_value_pairs.put({ key: 'recent_notes_history', value: updated });
      }
    });

    this.invalidateCache();

    const prefix = `note_backup_${id}`;
    Object.keys(localStorage)
      .filter(k => k.startsWith(prefix))
      .forEach(k => localStorage.removeItem(k));
  },

  async bulkDeleteNotesPermanent(ids: string[]): Promise<void> {
    await db.transaction('rw', [db.notes, db.note_versions, db.key_value_pairs, db.deleted_notes], async () => {
      await db.notes.bulkDelete(ids);
      await db.note_versions.where('noteId').anyOf(ids).delete();

      const tombstones = ids.map(id => ({ id, deletedAt: Date.now() }));
      await db.deleted_notes.bulkPut(tombstones);

      const hist = await db.key_value_pairs.get('recent_notes_history');
      if (hist?.value) {
        const updated = hist.value.filter((r: any) => !ids.includes(r.id));
        await db.key_value_pairs.put({ key: 'recent_notes_history', value: updated });
      }
    });

    this.invalidateCache();

    const allKeys = Object.keys(localStorage);
    for (const id of ids) {
      const prefix = `note_backup_${id}`;
      allKeys.filter(k => k.startsWith(prefix)).forEach(k => localStorage.removeItem(k));
    }
  },

  async deleteNotes(ids: string[]): Promise<void> {
    const now = Date.now();
    await db.notes.where('id').anyOf(ids).modify({ isTrashed: true, updatedAt: now });
    this.invalidateCache();
  },

  async bulkTrashNotes(ids: string[]): Promise<void> {
    const now = Date.now();
    await db.notes.where('id').anyOf(ids).modify({ isTrashed: true, updatedAt: now });
    this.invalidateCache();
  },

  async checkDuplicateTitle(title: string, workspaceId?: string): Promise<string> {
    let finalTitle = title;
    let counter = 1;
    const wsId = workspaceId || await WorkspaceService.getActiveWorkspaceId();

    const checkExists = async (t: string) => {
      const match = await db.notes
        .where('workspaceId')
        .equals(wsId)
        .and(n => n.title.toLowerCase() === t.toLowerCase())
        .first();
      return !!match;
    };

    while (await checkExists(finalTitle)) {
      finalTitle = `${title} (${counter})`;
      counter++;
    }
    return finalTitle;
  },

  async toggleLock(noteId: string): Promise<boolean> {
    const note = await db.notes.get(noteId);
    if (!note) return false;
    const newState = !note.isLocked;
    await db.notes.update(noteId, { isLocked: newState, updatedAt: Date.now() });
    this.invalidateCache();
    return newState;
  },

  async toggleFavorite(id: string): Promise<void> {
    const note = await db.notes.get(id);
    if (note) {
      const isNowFavorite = !note.isFavorite;
      let bookmarkFolderId = note.bookmarkFolderId;

      if (isNowFavorite) {
        let favFolder = await db.bookmark_folders.where('name').equals('Favorites').first();
        if (!favFolder) {
          favFolder = await this.createBookmarkFolder('Favorites');
        }
        bookmarkFolderId = favFolder.id;
      }

      await db.notes.update(id, {
        isFavorite: isNowFavorite,
        isBookmarked: isNowFavorite ? true : note.isBookmarked,
        bookmarkFolderId: isNowFavorite ? bookmarkFolderId : note.bookmarkFolderId
      });
      this.invalidateCache();
    }
  },

  // Bookmark Folders
  async getBookmarkFolders(): Promise<BookmarkFolder[]> {
    return await db.bookmark_folders.toArray();
  },

  async createBookmarkFolder(name: string, parentId?: string): Promise<BookmarkFolder> {
    const folder: BookmarkFolder = {
      id: crypto.randomUUID(),
      name,
      parentId,
      createdAt: Date.now()
    };
    await db.bookmark_folders.put(folder);
    return folder;
  },

  async deleteBookmarkFolder(id: string): Promise<void> {
    await db.transaction('rw', [db.bookmark_folders, db.notes], async () => {
      await db.bookmark_folders.delete(id);
      await db.notes.where('bookmarkFolderId').equals(id).modify({ bookmarkFolderId: undefined, isBookmarked: false });
      const subfolders = await db.bookmark_folders.where('parentId').equals(id).toArray();
      for (const sub of subfolders) {
        await this.deleteBookmarkFolder(sub.id);
      }
    });
  },

  async addNoteToBookmark(noteId: string, folderId?: string): Promise<void> {
    const note = await db.notes.get(noteId);
    if (note) {
      await db.notes.update(noteId, {
        isBookmarked: true,
        bookmarkFolderId: folderId,
        updatedAt: Date.now()
      });
      this.invalidateCache();
    }
  },

  async removeNoteFromBookmark(noteId: string): Promise<void> {
    await db.notes.update(noteId, {
      isBookmarked: false,
      bookmarkFolderId: undefined,
      updatedAt: Date.now()
    });
    this.invalidateCache();
  },

  // Versioning
  async saveVersion(version: NoteVersion): Promise<void> {
    const id = `v-${Date.now()}`;
    await db.note_versions.put({ ...version, id, createdAt: Date.now() });

    const noteVersions = await db.note_versions.where('noteId').equals(version.noteId).sortBy('createdAt');
    if (noteVersions.length > 10) {
      const toRemoveCount = noteVersions.length - 10;
      const idsToRemove = noteVersions.slice(0, toRemoveCount).map(v => v.id);
      await db.note_versions.bulkDelete(idsToRemove);
    }
  },

  async getVersions(noteId: string): Promise<NoteVersion[]> {
    return await db.note_versions.where('noteId').equals(noteId).reverse().sortBy('createdAt');
  },

  async deleteVersion(id: string): Promise<void> {
    await db.note_versions.delete(id);
  },

  async searchNotes(query: string): Promise<Note[]> {
    const notes = await this.getAllNotes();
    if (!query) return notes;

    const lowerQuery = query.toLowerCase();
    return notes.filter(n =>
      n.title.toLowerCase().includes(lowerQuery) ||
      n.content.toLowerCase().includes(lowerQuery)
    );
  },

  async replaceContent(idOrTitle: string, search: string, replacement: string): Promise<void> {
    let note = await db.notes.get(idOrTitle);
    if (!note) {
      note = await db.notes.where('title').equalsIgnoreCase(idOrTitle).first();
    }

    if (note) {
      note.content = note.content.replace(search, replacement);
      note.updatedAt = Date.now();
      await db.notes.put(note);
      this.invalidateCache();
    }
  }
};
