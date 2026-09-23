/**
 * @file types.ts
 * @brief TypeScript definitions matching C++ WebAssembly structs and module interface.
 *
 * @license Apache-2.0
 */

export interface NoteItemWasm {
  id: string;
  title: string;
  content: string;
  tags: string;
  updatedAt: number;
  isTrashed: boolean;
  isLocked: boolean;
}

export interface SearchResultWasm {
  id: string;
  title: string;
  score: number;
  matchType: string;
}

export interface NoteMetaWasm {
  id: string;
  title: string;
  workspaceId: string;
  parentId: string;
  tags: string;
  updatedAt: number;
  lastOpenedAt: number;
  isTrashed: boolean;
  isFavorite: boolean;
  isPinned: boolean;
}

export interface TagCountWasm {
  tag: string;
  count: number;
}

export interface CppSearchEngine {
  calculateFuzzyScore(text: string, pattern: string): number;
  calculateBM25(termFreq: number, docLength: number, avgDocLength: number, totalDocs: number, docsWithTerm: number): number;
  getPhoneticKey(word: string): string;
  searchNotes(notes: any, query: string): any;
}

export interface CppVaultEngine {
  hashPassword(password: string, salt: string): string;
  generateSalt(): string;
  encryptPayload(plaintext: string, key: string): string;
  decryptPayload(hexCipher: string, key: string): string;
  verifyPassword(inputPassword: string, storedHash: string, salt: string): boolean;
}

export interface CppProcessor {
  sortNotes(notes: any): any;
  getTop3RecentNotes(notes: any): any;
  calculateTagFrequencies(notes: any): any;
  filterNotesByFolder(notes: any, workspaceId: string, parentId: string): any;
}

export interface WasmModuleInterface {
  SearchEngine: {
    new(): CppSearchEngine;
    calculateFuzzyScore(text: string, pattern: string): number;
    calculateBM25(termFreq: number, docLength: number, avgDocLength: number, totalDocs: number, docsWithTerm: number): number;
    getPhoneticKey(word: string): string;
  };
  VaultEngine: {
    new(): CppVaultEngine;
    hashPassword(password: string, salt: string): string;
    generateSalt(): string;
    encryptPayload(plaintext: string, key: string): string;
    decryptPayload(hexCipher: string, key: string): string;
    verifyPassword(inputPassword: string, storedHash: string, salt: string): boolean;
  };
  Processor: {
    new(): CppProcessor;
    sortNotes(notes: any): any;
    getTop3RecentNotes(notes: any): any;
    calculateTagFrequencies(notes: any): any;
    filterNotesByFolder(notes: any, workspaceId: string, parentId: string): any;
  };
}
