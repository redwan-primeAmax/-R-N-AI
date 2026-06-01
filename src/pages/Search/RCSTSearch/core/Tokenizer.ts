import { SearchToken } from '../types';

// Stopwords lists for English & Bengali
const STOPWORDS = new Set([
  'and', 'the', 'is', 'in', 'at', 'of', 'on', 'for', 'with', 'a', 'an', 'to', 'it', 'this', 'that',
  'এবং', 'ও', 'করে', 'হয়', 'হবে', 'এই', 'সেই', 'ছিল', 'থেকে', 'আর', 'মাঝে'
]);

// Bidirectional Rich Synonym Graph Matrix for Query Expansion
const SYNONYM_MAP: { [key: string]: string[] } = {
  'gari': ['car', 'গাড়ি', 'যানবাহন'],
  'car': ['gari', 'গাড়ি', 'যানবাহন'],
  'গাড়ি': ['gari', 'car', 'যানবাহন'],
  'note': ['নোট', 'notebook', 'নোটবুক', 'পত্র'],
  'নোট': ['note', 'notebook', 'নোটবুক'],
  'notebook': ['note', 'নোট', 'নোটবুক'],
  'nbt': ['notebook', 'note'],
  'fast': ['দ্রুত', 'মাখন', 'smooth'],
  'দ্রুত': ['fast', 'মাখন', 'smooth'],
  'মাখন': ['fast', 'smooth', 'মখমল', 'মাখনের'],
  'smooth': ['fast', 'দ্রুত', 'মাখন'],
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

export function normalizeText(text: string): string {
  if (!text) return '';
  return text.toLowerCase().normalize('NFC');
}

export function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ');
}

export function expandQueryTerm(term: string): string[] {
  const normalized = normalizeText(term);
  const synonyms = SYNONYM_MAP[normalized] || [];
  return [term, ...synonyms];
}

// Pre-instantiated browser-native segmenter to prevent millions of garbage collector sweeps or redundant initializations
const globalSegmenter = (typeof Intl !== 'undefined' && (Intl as any).Segmenter)
  ? new (Intl as any).Segmenter(['bn', 'en'], { granularity: 'word' })
  : null;

export function tokenize(text: string, isQuery = false): SearchToken[] {
  const normalized = normalizeText(text);
  const tokens: SearchToken[] = [];
  let pos = 0;

  // Utilize advanced browser-native Intl.Segmenter if available
  if (globalSegmenter) {
    try {
      const segments = globalSegmenter.segment(normalized);
      
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
      // Failback
    }
  }

  // Alphanumeric word extraction fallback (both Western and Bengali range)
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
