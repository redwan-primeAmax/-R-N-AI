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
import Dexie from 'dexie';
import { VaultService } from './VaultService';

let cachedNotes: Note[] | null = null;
let cachedWorkspaceId: string | null = null;
let cacheVersion = 0;
let pendingRead: { workspaceId: string; version: number; promise: Promise<Note[]> } | null = null;

export const NoteService = {
  invalidateCache() {
    cacheVersion++;
    pendingRead = null;
    cachedNotes = null;
    cachedWorkspaceId = null;
  },

  async getAllNotes(forceRefresh: boolean = false): Promise<Note[]> {
    const currentWorkspaceId = await WorkspaceService.getActiveWorkspaceId();
    if (!forceRefresh && cachedNotes !== null && cachedWorkspaceId === currentWorkspaceId) {
      return cachedNotes;
    }

    const version = forceRefresh ? ++cacheVersion : cacheVersion;
    if (!forceRefresh && pendingRead?.workspaceId === currentWorkspaceId && pendingRead.version === version) return pendingRead.promise;
    const promise = db.notes.where('workspaceId').equals(currentWorkspaceId).toArray().then(notes => {
      const result = notes.map(n => VaultService.metadata(n));
      if (version === cacheVersion) {
        cachedNotes = result;
        cachedWorkspaceId = currentWorkspaceId;
      }
      return result;
    });
    const read = { workspaceId: currentWorkspaceId, version, promise };
    pendingRead = read;
    try { return await promise; }
    finally { if (pendingRead === read) pendingRead = null; }
  },

  async getNotesPaginated(page: number, pageSize: number): Promise<{ notes: Note[]; hasMore: boolean }> {
    if (!Number.isSafeInteger(page) || page < 0 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      throw new Error('Invalid note pagination');
    }
    const workspaceId = await WorkspaceService.getActiveWorkspaceId();
    // Read an ordered, bounded page from IndexedDB, not every note + a JS sort
    // and a second full count for each page. One extra row tells us hasMore.
    const rows = await db.notes.where('[workspaceId+updatedAt]')
      .between([workspaceId, Dexie.minKey], [workspaceId, Dexie.maxKey])
      .reverse().and(n => !n.isTrashed && !n.parentId && !n.bookmarkFolderId)
      .offset(page * pageSize).limit(pageSize + 1).toArray();
    return { notes: rows.slice(0, pageSize).map(n => VaultService.metadata(n)), hasMore: rows.length > pageSize };
  },

  /**
   * Optimized getNoteById (Issue 9 fix: pure read without redundant history/cache mutations)
   */
  async getNoteById(id: string, recordHistory: boolean = false): Promise<Note | null> {
    const note = await db.notes.get(id);
    if (note && recordHistory) {
      const now = Date.now();
      db.notes.update(id, { lastOpenedAt: now, updatedAt: now }).catch(() => {});
      HistoryManager.addNoteToHistory({
        id: note.id,
        title: note.title || 'Untitled',
        emoji: note.emoji || ''
      }).catch(() => {});
    }
    return note ? VaultService.read(note) : null;
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
    if (note._vaultRedacted) throw new Error('Unlock the note before editing it.');
    const currentWorkspaceId = await WorkspaceService.getActiveWorkspaceId();
    if (!note.workspaceId) {
      note.workspaceId = currentWorkspaceId;
    }
    const wsId = note.workspaceId;

    const processedContent = await MediaService.extractMediaFromContent(note.content);
    const now = Date.now();

    return await db.transaction('rw', [db.notes, db.deleted_notes, db.key_value_pairs, db.note_versions], async () => {
      // Tombstone protection (moved inside transaction)
      const isDeleted = await db.deleted_notes.get(note.id);
      if (isDeleted) {
        console.warn(`NoteService: Blocking re-creation of permanently deleted note ${note.id}`);
        return note;
      }

      const stored = await db.notes.get(note.id);
      if (stored?.isLocked) VaultService.key(stored);
      const existing = stored ? await Dexie.waitFor(VaultService.read(stored)) : undefined;
      const isNew = !existing;
      // A stale editor may still carry isLocked=false. Never let it remove encryption.
      if (stored?.isLocked) note = { ...note, isLocked: true, vaultSalt: stored.vaultSalt, password: stored.password };
      if (note.isLocked) VaultService.key(note);

      // A safety snapshot and overwrite either both commit or both roll back.
      if (existing && existing.content.length > 100_000 && processedContent.length < existing.content.length * 0.6) {
        const version: NoteVersion = {
          id: crypto.randomUUID(), noteId: note.id, title: existing.title || 'Untitled',
          content: existing.content, emoji: existing.emoji || '📝',
          version: 'Auto-Backup (content reduction)', createdAt: Date.now()
        };
        await db.note_versions.put(await Dexie.waitFor(VaultService.sealVersion(version, note)));
      }

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
            .where('title')
            .equalsIgnoreCase(title)
            .and(n => n.workspaceId === wsId)
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

      await db.notes.put(await Dexie.waitFor(VaultService.seal(updatedNote)));
      this.invalidateCache();

      // Trigger background agent tasks
      if (!updatedNote.isLocked && updatedNote.content.length >= 20) {
        void import('../../agent/AgentService').then(({ AgentService }) => AgentService.onNoteSaved(updatedNote)).catch(() => {});
      }

      return updatedNote;
    });
  },

  async updateNote(id: string, updates: Partial<Note>): Promise<void> {
    const raw = await db.notes.get(id);
    if (!raw) return;
    if (raw.isLocked && updates.isLocked === false) {
      const unlocked = await VaultService.removeLock(id);
      await this.saveNote({ ...unlocked, ...updates, id });
    } else {
      if (raw.isLocked) VaultService.key(raw);
      const note = await VaultService.read(raw);
      await this.saveNote({ ...note, ...updates, id });
    }
    this.invalidateCache();
  },

  async duplicateNote(id: string): Promise<Note | null> {
    const raw = await db.notes.get(id);
    if (!raw) return null;
    if (raw.isLocked) VaultService.key(raw);
    const note = await VaultService.read(raw);
    const newId = crypto.randomUUID();
    if (raw.isLocked) VaultService.copySession(raw, newId);
    // Use the same transactional quota and title validation as ordinary creation.
    return this.saveNote({ ...note, id: newId, title: `${note.title} (Copy)`, createdAt: Date.now(), updatedAt: Date.now() });
  },

  async lockNote(id: string, password: string): Promise<Note> {
    const note = await VaultService.lock(id, password);
    this.invalidateCache();
    return note;
  },
  async authorizeNote(id: string, password: string): Promise<boolean> {
    const valid = await VaultService.authorize(id, password);
    this.invalidateCache();
    return valid;
  },
  async saveDraft(id: string, key: string, value: unknown): Promise<void> {
    // Re-check the persisted lock inside the transaction; a pending timer must not
    // recreate plaintext drafts after a note was encrypted in another callback/tab.
    await db.transaction('rw', [db.notes, db.key_value_pairs], async () => {
      const note = await db.notes.get(id);
      if (note && !note.isLocked) await db.key_value_pairs.put({ key, value });
    });
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

  async restoreNote(id: string): Promise<void> {
    const note = await db.notes.get(id);
    if (note) {
      await db.notes.update(id, { isTrashed: false, updatedAt: Date.now() });
      this.invalidateCache();
    }
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
    if (!note.isLocked) throw new Error('A password is required to encrypt a note.');
    await VaultService.removeLock(noteId);
    this.invalidateCache();
    return false;
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
    await db.transaction('rw', [db.notes, db.note_versions], async () => {
      const note = await db.notes.get(version.noteId);
      if (!note) throw new Error('Note not found');
      const snapshot = { ...version, id: crypto.randomUUID(), createdAt: Date.now() };
      await db.note_versions.put(await Dexie.waitFor(VaultService.sealVersion(snapshot, note)));
      const versions = await db.note_versions.where('noteId').equals(version.noteId).sortBy('createdAt');
      if (versions.length > 10) await db.note_versions.bulkDelete(versions.slice(0, versions.length - 10).map(v => v.id));
    });
  },

  async getVersions(noteId: string): Promise<NoteVersion[]> {
    const note = await db.notes.get(noteId);
    if (!note) return [];
    const versions = await db.note_versions.where('noteId').equals(noteId).sortBy('createdAt');
    return Promise.all(versions.reverse().map(v => VaultService.readVersion(v, note)));
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
      if (note.isLocked) VaultService.key(note);
      const plain = await VaultService.read(note);
      await this.saveNote({ ...plain, content: plain.content.replace(search, replacement) });
      this.invalidateCache();
    }
  }
};
