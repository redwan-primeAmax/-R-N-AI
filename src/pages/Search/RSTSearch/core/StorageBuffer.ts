import { DocumentInfo } from '../types';
import { Note } from '../../../../services/storage/DataManager';

export class StorageBuffer {
  // Flat Arrays for extremely fast indexing and zero object field lookup overhead
  private docIndices: Int32Array = new Int32Array(0);
  private docLengths: Uint32Array = new Uint32Array(0);
  private docIds: string[] = [];
  private noteReferences: Note[] = [];

  // Primitive Buffer Serialization (Raw Pointer Matrix & String Pool)
  private stringPool: string = "";
  private docStarts: Int32Array = new Int32Array(0);
  private docEnds: Int32Array = new Int32Array(0);

  // Average document length caches for BM25 calculation
  private avgDocLength: number = 0;

  /**
   * Resets and initializes the storage buffer with a flat representation of standard Note records
   */
  public load(notes: Note[], tokenizeFn: (text: string) => any[]): void {
    const size = notes.length;
    this.docIndices = new Int32Array(size);
    this.docLengths = new Uint32Array(size);
    this.docIds = new Array<string>(size);
    this.noteReferences = [...notes];

    this.docStarts = new Int32Array(size);
    this.docEnds = new Int32Array(size);
    
    let poolBuilder = "";
    let totalLength = 0;

    for (let i = 0; i < size; i++) {
      const note = notes[i];
      const titleText = note.title || '';
      const contentText = note.content || '';
      const descriptionText = note.description || '';
      const tagsText = (note.tags || []).join(' ');

      // Concatenated searchable text content
      const fullText = `${titleText} 🛑 ${descriptionText} 🛑 ${tagsText} 🛑 ${contentText}`;
      const tokensCount = tokenizeFn(fullText).length;

      this.docIndices[i] = i;
      this.docLengths[i] = tokensCount;
      this.docIds[i] = note.id;

      // Pool Pointer Tracking
      const startOffset = poolBuilder.length;
      poolBuilder += fullText + " 🏁 ";
      const endOffset = poolBuilder.length;

      this.docStarts[i] = startOffset;
      this.docEnds[i] = endOffset;

      totalLength += tokensCount;
    }

    this.stringPool = poolBuilder;
    this.avgDocLength = size > 0 ? totalLength / size : 0;
  }

  /**
   * Reads raw string from flat pool using character-pointer offset lookup
   */
  public getDocumentText(index: number): string {
    if (index < 0 || index >= this.docStarts.length) return "";
    return this.stringPool.substring(this.docStarts[index], this.docEnds[index]);
  }

  public getDocumentInfo(index: number): DocumentInfo {
    return {
      id: this.docIds[index],
      index: index,
      length: this.docLengths[index]
    };
  }

  public getNoteByIndex(index: number): Note {
    return this.noteReferences[index];
  }

  public getAverageLength(): number {
    return this.avgDocLength;
  }

  public getCount(): number {
    return this.noteReferences.length;
  }

  /**
   * Quick check to see if we can perform index matching based on ID offsets
   */
  public findIndexById(id: string): number {
    return this.docIds.indexOf(id);
  }
}
