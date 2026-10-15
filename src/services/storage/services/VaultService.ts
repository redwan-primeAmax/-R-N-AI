import Dexie from 'dexie';
import localforage from 'localforage';
import { db } from '../DexieDB';
import type { Note, NoteVersion } from '../../../types';
import { deriveVaultKey, newSalt, hashPassword, verifyPassword, encryptVaultText, decryptVaultText } from '../../../utils/crypto';
import { decryptText } from './SettingsService';

// Non-extractable keys only live in this tab's memory. Never persist keys/passwords.
const sessions = new Map<string, { salt: string; key: CryptoKey }>();
export const VaultService = {
  isAuthorized(note: Note): boolean { return !!note.vaultSalt && sessions.get(note.id)?.salt === note.vaultSalt; },
  forgetAll() { sessions.clear(); },
  forget(id: string) { sessions.delete(id); },
  key(note: Note): CryptoKey {
    const session = sessions.get(note.id);
    if (!session || session.salt !== note.vaultSalt) throw new Error('Unlock this note with its password first.');
    return session.key;
  },
  metadata(note: Note): Note {
    return note.isLocked ? { ...note, _vaultRedacted: true, content: '', comments: [], snapshots: [], tags: [], aiTags: [] } : note;
  },
  async read(note: Note): Promise<Note> {
    if (!note.isLocked) return note;
    if (!this.isAuthorized(note)) return this.metadata(note);
    const payload = JSON.parse(await decryptVaultText(note.content, this.key(note), `note:${note.id}`));
    return { ...note, ...payload, _vaultRedacted: false };
  },
  async seal(note: Note): Promise<Note> {
    if (!note.isLocked) return { ...note, vaultSalt: undefined, password: undefined };
    const payload = { content: note.content, comments: note.comments || [], snapshots: note.snapshots || [], tags: note.tags || [], aiTags: note.aiTags || [] };
    return { ...note, content: await encryptVaultText(JSON.stringify(payload), this.key(note), `note:${note.id}`), comments: undefined, snapshots: undefined, tags: [], aiTags: [] };
  },
  async sealVersion(version: NoteVersion, note: Note): Promise<NoteVersion> {
    return note.isLocked ? { ...version, content: await encryptVaultText(version.content, this.key(note), `version:${version.id}`) } : version;
  },
  async readVersion(version: NoteVersion, note: Note): Promise<NoteVersion> {
    if (!note.isLocked) return version;
    if (!this.isAuthorized(note)) throw new Error('Unlock the note to read its history.');
    return { ...version, content: await decryptVaultText(version.content, this.key(note), `version:${version.id}`) };
  },
  copySession(source: Note, id: string) {
    sessions.set(id, { salt: source.vaultSalt!, key: this.key(source) });
  },
  async authorize(id: string, password: string): Promise<boolean> {
    const note = await db.notes.get(id);
    if (!note?.isLocked) return false;
    if (note.vaultSalt) {
      try {
        const key = await deriveVaultKey(password, note.vaultSalt);
        await decryptVaultText(note.content, key, `note:${id}`);
        sessions.set(id, { salt: note.vaultSalt, key });
        return true;
      } catch { return false; }
    }
    // Old notes used three incompatible password formats. Authenticate before migration.
    let stored = note.password;
    if (!stored) stored = (await db.key_value_pairs.get('master_user_profile'))?.value?.masterPassword;
    let valid = false;
    if (stored?.startsWith('RDW1')) valid = (await decryptText(stored)) === password;
    else if (stored) valid = await verifyPassword(password, stored, true);
    if (!valid) return false;
    await this.lock(id, password, true);
    return true;
  },
  async lock(id: string, password: string, migrating = false): Promise<Note> {
    if (!migrating && password.length < 8) throw new Error('Use a password of at least 8 characters.');
    const salt = newSalt();
    const key = await deriveVaultKey(password, salt);
    const verifier = await hashPassword(password);
    const oldSession = sessions.get(id);
    let result: Note;
    try {
      result = await db.transaction('rw', [db.notes, db.note_versions, db.key_value_pairs, db.note_embeddings], async () => {
        const raw = await db.notes.get(id);
        if (!raw) throw new Error('Note not found');
        if (raw.isLocked && !migrating) throw new Error('Remove the existing lock before changing its password.');
        const plain = raw.vaultSalt ? await Dexie.waitFor(this.read(raw)) : raw;
        if (raw.vaultSalt && !this.isAuthorized(raw)) throw new Error('Unlock the note first.');
        const versions = await db.note_versions.where('noteId').equals(id).toArray();
        const plaintextVersions = raw.vaultSalt ? await Dexie.waitFor(Promise.all(versions.map(v => this.readVersion(v, raw)))) : versions;
        sessions.set(id, { salt, key });
        const locked = { ...plain, _vaultRedacted: false, isLocked: true, vaultSalt: salt, password: verifier, updatedAt: Date.now() };
        await db.notes.put(await Dexie.waitFor(this.seal(locked)));
        await db.note_versions.bulkPut(await Dexie.waitFor(Promise.all(plaintextVersions.map(v => this.sealVersion(v, locked)))));
        // Remove plaintext recovery/search copies when transitioning to encrypted storage.
        const keys = await db.key_value_pairs.toCollection().primaryKeys();
        const privateKeys = keys.filter(k => k === `note_draft_${id}` || k.startsWith(`note_backup_${id}`) || k.startsWith(`raw_html_backup_${id}`));
        await db.key_value_pairs.bulkDelete(privateKeys);
        await db.note_embeddings.where('noteId').equals(id).delete();
        return locked;
      });
    } catch (error) {
      if (oldSession) sessions.set(id, oldSession); else sessions.delete(id);
      throw error;
    }
    Object.keys(localStorage).filter(k => k.startsWith(`note_backup_${id}`) || k === `note_draft_${id}` || k.startsWith(`raw_html_backup_${id}`)).forEach(k => localStorage.removeItem(k));
    for (const [storageKey, idField] of [['notes', 'id'], ['rn_note_versions', 'noteId']]) {
      const records = await localforage.getItem<any[]>(storageKey);
      if (Array.isArray(records) && records.some(r => r[idField] === id)) {
        await localforage.setItem(storageKey, records.filter(r => r[idField] !== id));
      }
    }
    return result;
  },
  async removeLock(id: string): Promise<Note> {
    const result = await db.transaction('rw', [db.notes, db.note_versions], async () => {
      const raw = await db.notes.get(id);
      if (!raw) throw new Error('Note not found');
      if (!raw.isLocked) return raw;
      this.key(raw); // Authentication is mandatory; never just flip isLocked.
      const plain = await Dexie.waitFor(this.read(raw));
      const versions = await db.note_versions.where('noteId').equals(id).toArray();
      await db.note_versions.bulkPut(await Dexie.waitFor(Promise.all(versions.map(v => this.readVersion(v, raw)))));
      const unlocked = { ...plain, isLocked: false, vaultSalt: undefined, password: undefined, updatedAt: Date.now() };
      await db.notes.put(unlocked);
      return unlocked;
    });
    sessions.delete(id);
    return result;
  },
};
