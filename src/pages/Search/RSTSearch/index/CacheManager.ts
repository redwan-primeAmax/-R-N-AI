import { StorageBuffer } from '../core/StorageBuffer';
import { InvertedIndex } from './InvertedIndex';
import { Note } from '../../../../services/storage/DataManager';
import { tokenize } from '../core/Tokenizer';

export class CacheManager {
  private storageBuffer = new StorageBuffer();
  private invertedIndex = new InvertedIndex();
  
  // Tracking Maps for Delta-Inverted Indexing
  private noteDocTerms = new Map<string, Set<string>>();
  private noteLastUpdated = new Map<string, number>();
  
  private lastNotesChecksum: string = '';
  private isLoaded: boolean = false;

  /**
   * Generates a rapid fingerprint checksum based on note count, IDs, and modified timestamps
   */
  private calculateChecksum(notes: Note[]): string {
    let checksum = `${notes.length}-`;
    let maxTimestamp = 0;
    
    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      if (note.updatedAt > maxTimestamp) {
        maxTimestamp = note.updatedAt;
      }
    }
    
    checksum += `${maxTimestamp}`;
    return checksum;
  }

  /**
   * Safe-gets ready instances of storage buffer and inverted index.
   * Auto-composes or refreshes them using high-speed Delta updates.
   */
  public ensureIndex(notes: Note[]): { storage: StorageBuffer; index: InvertedIndex } {
    const currentChecksum = this.calculateChecksum(notes);

    if (!this.isLoaded) {
      // First Load (Cold build)
      this.coldBuild(notes);
    } else if (currentChecksum !== this.lastNotesChecksum) {
      // High-Speed Delta Incremental Update (Warm update)
      this.deltaUpdate(notes);
    }

    return {
      storage: this.storageBuffer,
      index: this.invertedIndex
    };
  }

  private coldBuild(notes: Note[]): void {
    this.storageBuffer.load(notes, (text) => tokenize(text, false));
    this.noteDocTerms.clear();
    this.noteLastUpdated.clear();

    const docTokensList: { docIndex: number; tokens: { term: string }[] }[] = [];
    const count = this.storageBuffer.getCount();

    for (let i = 0; i < count; i++) {
      const note = this.storageBuffer.getNoteByIndex(i);
      const textToTokenize = `${note.title || ''} ${note.description || ''} ${(note.tags || []).join(' ')} ${note.content || ''}`;
      const tokens = tokenize(textToTokenize, false);
      
      const termSet = new Set<string>();
      for (const t of tokens) {
        termSet.add(t.term);
      }
      
      this.noteDocTerms.set(note.id, termSet);
      this.noteLastUpdated.set(note.id, note.updatedAt);

      docTokensList.push({
        docIndex: i,
        tokens
      });
    }

    this.invertedIndex.build(docTokensList);
    this.lastNotesChecksum = this.calculateChecksum(notes);
    this.isLoaded = true;
  }

  private deltaUpdate(notes: Note[]): void {
    const activeNoteIds = new Set(notes.map(n => n.id));
    
    // 1. Identify and handle Deleted notes
    for (const [id, oldTerms] of this.noteDocTerms.entries()) {
      if (!activeNoteIds.has(id)) {
        const deletedDocIdx = this.storageBuffer.findIndexById(id);
        if (deletedDocIdx !== -1) {
          this.invertedIndex.removeDocIndex(deletedDocIdx, oldTerms);
        }
        this.noteDocTerms.delete(id);
        this.noteLastUpdated.delete(id);
      }
    }

    // 2. Identify new or modified notes and update their term lists
    let hasChanges = false;
    for (const note of notes) {
      const lastUpdate = this.noteLastUpdated.get(note.id) || 0;
      if (note.updatedAt > lastUpdate) {
        hasChanges = true;
        const docIdx = this.storageBuffer.findIndexById(note.id);
        
        // Remove prior terms in index
        const priorTerms = this.noteDocTerms.get(note.id);
        if (priorTerms && docIdx !== -1) {
          this.invertedIndex.removeDocIndex(docIdx, priorTerms);
        }

        // Tokenize new content
        const textToTokenize = `${note.title || ''} ${note.description || ''} ${(note.tags || []).join(' ')} ${note.content || ''}`;
        const tokens = tokenize(textToTokenize, false);

        const newTermsSet = new Set<string>();
        const termFreqMap = new Map<string, number>();

        for (const t of tokens) {
          newTermsSet.add(t.term);
          termFreqMap.set(t.term, (termFreqMap.get(t.term) || 0) + 1);
        }

        // Update Inverted Index with new terms frequencies
        const targetDocIdx = docIdx !== -1 ? docIdx : this.storageBuffer.getCount();
        this.invertedIndex.addDocIndexTerms(targetDocIdx, termFreqMap);

        this.noteDocTerms.set(note.id, newTermsSet);
        this.noteLastUpdated.set(note.id, note.updatedAt);
      }
    }

    // If notes count or sequence changed, refresh search storage references in background
    if (hasChanges || notes.length !== this.storageBuffer.getCount()) {
      this.storageBuffer.load(notes, (text) => tokenize(text, false));
    }

    this.lastNotesChecksum = this.calculateChecksum(notes);
  }

  public invalidate(): void {
    this.isLoaded = false;
    this.lastNotesChecksum = '';
    this.noteDocTerms.clear();
    this.noteLastUpdated.clear();
  }
}
