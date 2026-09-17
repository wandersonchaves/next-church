import { describe, expect, it } from 'vitest';
import { EMOJI_CATEGORIES, normalizeEmojiText, QUICK_EMOJIS, searchEmojis } from './EmojiData';

describe('EmojiData', () => {
  describe('normalizeEmojiText', () => {
    it('normalizes accents and whitespace correctly', () => {
      expect(normalizeEmojiText('  Oração  ')).toBe('oracao');
      expect(normalizeEmojiText('Bênção')).toBe('bencao');
      expect(normalizeEmojiText('FÉ')).toBe('fe');
      expect(normalizeEmojiText('Família')).toBe('familia');
    });
  });

  describe('searchEmojis', () => {
    it('returns all emojis when query is empty', () => {
      const results = searchEmojis('');

      expect(results.length).toBeGreaterThan(50);
    });

    it('finds prayer emoji when searching with or without accents', () => {
      const withAccents = searchEmojis('oração');
      const withoutAccents = searchEmojis('oracao');

      expect(withAccents.some(e => e.emoji === '🙏')).toBe(true);
      expect(withoutAccents.some(e => e.emoji === '🙏')).toBe(true);
    });

    it('finds church and faith items by english and portuguese keywords', () => {
      const ptResults = searchEmojis('igreja');
      const enResults = searchEmojis('church');
      const bibleResults = searchEmojis('bible');

      expect(ptResults.some(e => e.emoji === '⛪')).toBe(true);
      expect(enResults.some(e => e.emoji === '⛪')).toBe(true);
      expect(bibleResults.some(e => e.emoji === '📖')).toBe(true);
    });

    it('finds fire emoji when searching for avivamento or fire', () => {
      const revivalResults = searchEmojis('avivamento');
      const fireResults = searchEmojis('fogo');

      expect(revivalResults.some(e => e.emoji === '🔥')).toBe(true);
      expect(fireResults.some(e => e.emoji === '🔥')).toBe(true);
    });

    it('returns empty array when query does not match anything', () => {
      const results = searchEmojis('xyz123randomnonexistentterm');

      expect(results).toHaveLength(0);
    });
  });

  describe('QUICK_EMOJIS', () => {
    it('contains essential church and communication emojis', () => {
      expect(QUICK_EMOJIS).toContain('🙏');
      expect(QUICK_EMOJIS).toContain('🔥');
      expect(QUICK_EMOJIS).toContain('⛪');
      expect(QUICK_EMOJIS).toContain('❤️');
      expect(QUICK_EMOJIS).toContain('✨');
    });
  });

  describe('EMOJI_CATEGORIES', () => {
    it('contains faith, emotions, people, symbols, events and communication categories', () => {
      const categoryIds = EMOJI_CATEGORIES.map(c => c.id);

      expect(categoryIds).toContain('faith');
      expect(categoryIds).toContain('emotions');
      expect(categoryIds).toContain('people');
      expect(categoryIds).toContain('symbols');
      expect(categoryIds).toContain('events');
      expect(categoryIds).toContain('communication');
    });
  });
});
