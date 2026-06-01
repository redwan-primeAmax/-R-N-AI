import { Note } from '../types';

export const TextUtils = {
  /**
   * Counts words in a string
   */
  countWords: (text: string): number => {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  },

  /**
   * Summarizes text (simple truncation for now, or AI fallback)
   */
  summarize: (text: string, maxLength: number = 200): string => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  },

  /**
   * Removes all numbers from text
   */
  removeNumbers: (text: string): string => {
    return text.replace(/[0-9]/g, '');
  },

  /**
   * Generates a slug from a title
   */
  slugify: (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
};
