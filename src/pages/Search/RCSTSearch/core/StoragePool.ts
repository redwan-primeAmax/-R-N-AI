import { DocumentInfo } from '../types';
import { Note } from '../../../../services/storage/DataManager';

export class StoragePool {
  // Flat typed arrays for maximum cache friendliness and low RAM foot-print
  private docIndices: Int32Array = new Int32Array(0);
  private docLengths: Uint32Array = new Uint32Array(0);
  private docIds: string[] = [];
  private noteReferences: Note[] = [];

  // Primitive Buffer Serialization (Raw Pointer Matrix & String Pool)
  private stringPool: string = "";
  private docStarts: Int32Array = new Int32Array(0);
  private docEnds: Int32Array = new Int32Array(0);

  private avgDocLength: number = 0;

  /**
   * Loads documents into a flat string memory pool and sets pointer margins
   */
  public load(notes: Note[]): void {
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

      // Concatenated searchable text block
      const fullText = `${titleText} 🛑 ${descriptionText} 🛑 ${tagsText} 🛑 ${contentText}`;
      // Fast whitespace/character approximation of tokens count
      const tokensCount = Math.max(1, fullText.split(/\s+/).length);

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
   * Extract raw string from flat pool using CPU-friendly start/end memory indices
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

  public findIndexById(id: string): number {
    return this.docIds.indexOf(id);
  }
}
