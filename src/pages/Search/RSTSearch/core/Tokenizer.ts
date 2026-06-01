import { SearchToken } from '../types';

// Simple list of common stopwords (English & Bengali) to prevent polluting the index with noise
const STOPWORDS = new Set([
  'and', 'the', 'is', 'in', 'at', 'of', 'on', 'for', 'with', 'a', 'an', 'to', 'it', 'this', 'that',
  'এবং', 'ও', 'করে', 'হয়', 'হবে', 'এই', 'সেই', 'ছিল', 'থেকে', 'আর', 'মাঝে'
]);

// Helper to normalize Bengali Unicode and convert to lowercase
export function normalizeText(text: string): string {
  if (!text) return '';
  // Convert to lowercase and normalize Unicode characters to a standard form (NFC is best for Bengali)
  return text.toLowerCase().normalize('NFC');
}

// Fast HTML Stripper to extract clean searchable text
export function stripHtml(html: string): string {
  if (!html) return '';
  // Rapid regex-based html strip
  return html.replace(/<[^>]*>/g, ' ');
}

// Synonym Graph Matrix for Local Query Expansion (Bangla & English)
const SYNONYM_MAP: { [key: string]: string[] } = {
  'gari': ['car', 'গাড়ি', 'যানবাহন'],
  'car': ['gari', 'গাড়ি', 'যানবাহন'],
  'গাড়ি': ['gari', 'car', 'যানবাহন'],
  'note': ['নোট', 'notebook', 'নোটবুক', 'পত্র'],
  'নোট': ['note', 'notebook', 'নোটবুক'],
  'nbt': ['notebook', 'note'],
  'fast': ['দ্রুত', 'মাখন', 'smooth'],
  'দ্রুত': ['fast', 'মাখন', 'smooth'],
  'মাখন': ['fast', 'smooth', 'মখমল'],
  'কাজ': ['todo', 'task', 'work'],
  'task': ['কাজ', 'todo', 'work'],
  'todo': ['কাজ', 'task', 'work'],
  'ছবি': ['image', 'photo', 'picture', 'pic'],
  'image': ['ছবি', 'photo', 'picture', 'pic'],
  'photo': ['ছবি', 'image', 'picture', 'pic'],
  'important': ['গুরুত্বপূর্ণ', 'জরুরী', 'urg', 'urgent'],
  'urgent': ['গুরুত্বপূর্ণ', 'জরুরী', 'জরুরি', 'urg'],
  'জরুরী': ['urgent', 'important', 'জরুরি'],
  'জরুরি': ['urgent', 'important', 'জরুরী'],
  'personal': ['ব্যক্তিগত', 'নিজে'],
  'ব্যক্তিগত': ['personal', 'নিজস্ব'],
  'all': ['সব', 'সবাই'],
  'সব': ['all', 'সবাই']
};

export function expandQueryTerm(term: string): string[] {
  const normalized = term.toLowerCase().normalize('NFC');
  const synonyms = SYNONYM_MAP[normalized] || [];
  return [term, ...synonyms];
}

export function tokenize(text: string, isQuery = false): SearchToken[] {
  const normalized = normalizeText(text);
  const tokens: SearchToken[] = [];
  let pos = 0;

  // Utilize the advanced browser-native Intl.Segmenter if available (perfect Bengali support)
  if (typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
    try {
      const segmenter = new (Intl as any).Segmenter(['bn', 'en'], { granularity: 'word' });
      const segments = segmenter.segment(normalized);
      
      for (const segment of segments) {
        if (segment.isWordLike) {
          const term = segment.segment.trim();
          if (term.length > 0 && (isQuery || !STOPWORDS.has(term))) {
            tokens.push({ term, position: pos++ });
          }
        }
      }
      return tokens;
    } catch (e) {
      // Fallback if segmenter instantiation fails
    }
  }

  // Robust, high-speed Regex Fallback for word extraction
  // Matches English alphanumeric words and Bengali Unicode character blocks perfectly
  const regex = /[\w\d\u0980-\u09FF]+/g;
  let match;
  while ((match = regex.exec(normalized)) !== null) {
    const term = match[0];
    if (term.length > 0 && (isQuery || !STOPWORDS.has(term))) {
      tokens.push({ term, position: pos++ });
    }
  }

  return tokens;
}
