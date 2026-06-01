export interface SearchToken {
  term: string;
  position: number;
}

export interface DocumentInfo {
  id: string; // Original Note ID
  index: number; // Flat array index
  length: number; // Total word count
}

export interface IndexEntry {
  docIndex: number;
  frequency: number; // Term frequency in document
}

export interface InvertedIndexMap {
  [term: string]: IndexEntry[];
}
