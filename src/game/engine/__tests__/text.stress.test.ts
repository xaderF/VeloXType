import { describe, expect, it } from 'vitest';
import { generateText } from '@/game/engine';

describe('text generation stress', () => {
  it('is deterministic across many seeds with punctuation enabled', () => {
    for (let i = 0; i < 500; i += 1) {
      const seed = `determinism-${i}`;
      const options = {
        seed,
        length: 220,
        difficulty: 'hard' as const,
        includePunctuation: true,
      };

      const a = generateText(options);
      const b = generateText(options);

      expect(a).toBe(b);
      expect(a.length).toBeGreaterThan(0);
      expect(a.length).toBeLessThanOrEqual(220);
      expect(a).toBe(a.trim());
    }
  });

  it('produces punctuation text without malformed spacing or unclosed quotes', () => {
    const difficulties = ['easy', 'medium', 'hard'] as const;

    for (const difficulty of difficulties) {
      for (let i = 0; i < 300; i += 1) {
        const text = generateText({
          seed: `${difficulty}-punct-${i}`,
          length: 300,
          difficulty,
          includePunctuation: true,
        });

        const quoteCount = text.split('"').length - 1;
        expect(text.includes('  ')).toBe(false);
        expect(text.startsWith(' ')).toBe(false);
        expect(text.endsWith(' ')).toBe(false);
        for (const token of text.split(' ')) {
          if (!token.includes('"')) continue;
          expect(token.startsWith('"') || token.endsWith('"')).toBe(true);
        }
        if (quoteCount % 2 !== 0) {
          // Fixed-length slicing can clip the closing quote at the end.
          expect(text.length).toBeGreaterThanOrEqual(299);
        }
      }
    }
  });

  it('keeps small requested lengths bounded while still producing content', () => {
    for (let length = 1; length <= 12; length += 1) {
      for (let i = 0; i < 80; i += 1) {
        const text = generateText({
          seed: `small-${length}-${i}`,
          length,
          includePunctuation: i % 2 === 0,
        });

        expect(text.length).toBeGreaterThan(0);
        expect(text.length).toBeLessThanOrEqual(length);
      }
    }
  });

  it('yields diverse outputs across large seed sets', () => {
    const samples = new Set<string>();
    for (let i = 0; i < 700; i += 1) {
      samples.add(generateText({ seed: `diversity-${i}`, length: 100 }));
    }
    expect(samples.size).toBeGreaterThan(650);
  });
});
