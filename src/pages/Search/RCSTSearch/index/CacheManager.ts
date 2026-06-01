import { StoragePool } from '../core/StoragePool';
import { InvertedIndex } from './InvertedIndex';
import { Note } from '../../../../services/storage/DataManager';
import { tokenize } from '../core/Tokenizer';

export class CacheManager {
  private storagePool = new StoragePool();
  private invertedIndex = new InvertedIndex();
  
  // High-Speed Index Mutation trackers
  private noteDocTerms = new Map<string, Set<string>>();
  private noteLastUpdated = new Map<string, number>();

  private lastNotesChecksum: string = '';
  private isLoaded: boolean = false;

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
   * Return indices or refresh them using warm delta incremental optimizations
   */
  public ensureIndex(notes: Note[]): { storage: StoragePool; index: InvertedIndex } {
    const currentChecksum = this.calculateChecksum(notes);

    if (!this.isLoaded) {
      // Warm initial setup (cold-build)
      this.coldBuild(notes);
    } else if (currentChecksum !== this.lastNotesChecksum) {
      // High-speed surgical update (warm delta updates)
      this.deltaUpdate(notes);
    }

    return {
      storage: this.storagePool,
      index: this.invertedIndex
    };
  }

  private coldBuild(notes: Note[]): void {
    this.storagePool.load(notes);
    this.noteDocTerms.clear();
    this.noteLastUpdated.clear();

    const docTokensList: { docIndex: number; tokens: { term: string }[] }[] = [];
    const count = this.storagePool.getCount();

    for (let i = 0; i < count; i++) {
      const note = this.storagePool.getNoteByIndex(i);
      const textToTokenize = `${note.title || ''} ${note.description || ''} ${(note.tags || []).join(' ')} ${(note.content || '').substring(0, 500)}`;
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
    let indexMutated = false;
    
    // 1. Surgical Removal for Delete operations
    for (const [id, oldTerms] of this.noteDocTerms.entries()) {
      if (!activeNoteIds.has(id)) {
        const deletedDocIdx = this.storagePool.findIndexById(id);
        if (deletedDocIdx !== -1) {
          this.invertedIndex.removeDocIndex(deletedDocIdx, oldTerms, true);
          indexMutated = true;
        }
        this.noteDocTerms.delete(id);
        this.noteLastUpdated.delete(id);
      }
    }

    // 2. Surgical Addition & Updates
    let hasChanges = false;
    for (const note of notes) {
      const lastUpdate = this.noteLastUpdated.get(note.id) || 0;
      if (note.updatedAt > lastUpdate) {
        hasChanges = true;
        const docIdx = this.storagePool.findIndexById(note.id);
        
        // Purge pre-modified token links
        const priorTerms = this.noteDocTerms.get(note.id);
        if (priorTerms && docIdx !== -1) {
          this.invertedIndex.removeDocIndex(docIdx, priorTerms, true);
        }

        const textToTokenize = `${note.title || ''} ${note.description || ''} ${(note.tags || []).join(' ')} ${(note.content || '').substring(0, 500)}`;
        const tokens = tokenize(textToTokenize, false);

        const newTermsSet = new Set<string>();
        const termFreqMap = new Map<string, number>();

        for (const t of tokens) {
          newTermsSet.add(t.term);
          termFreqMap.set(t.term, (termFreqMap.get(t.term) || 0) + 1);
        }

        const targetDocIdx = docIdx !== -1 ? docIdx : this.storagePool.getCount();
        this.invertedIndex.addDocIndexTerms(targetDocIdx, termFreqMap, true);
        indexMutated = true;

        this.noteDocTerms.set(note.id, newTermsSet);
        this.noteLastUpdated.set(note.id, note.updatedAt);
      }
    }

    if (indexMutated) {
      this.invertedIndex.rebuildVocabulary();
    }

    // Refresh memory storage pointers if counts or items mutated
    if (hasChanges || notes.length !== this.storagePool.getCount()) {
      this.storagePool.load(notes);
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
