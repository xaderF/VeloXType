import { describe, expect, it } from 'vitest';
import { damageFromScores, performanceScore } from '@/game/match/scoring';

describe('match scoring stress', () => {
  it('keeps performance score in [0, 100] across extreme inputs', () => {
    const ratings: Array<number | null> = [null, -100, 0, 150, 450, 900, 1500, 2100, 5000];

    for (const rating of ratings) {
      for (let wpm = -40; wpm <= 260; wpm += 4) {
        for (let accuracy = -0.4; accuracy <= 1.4; accuracy += 0.05) {
          const score = performanceScore({
            wpm,
            accuracy,
            consistency: 0.8,
          }, rating);

          expect(Number.isInteger(score)).toBe(true);
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it('is monotonic for WPM at fixed rating and accuracy', () => {
    const ratings: Array<number | null> = [null, 100, 600, 1200, 1800, 2400];
    const accuracies = [0.35, 0.55, 0.75, 0.95];

    for (const rating of ratings) {
      for (const accuracy of accuracies) {
        let previous = -1;
        for (let wpm = 0; wpm <= 260; wpm += 1) {
          const score = performanceScore({ wpm, accuracy, consistency: 1 }, rating);
          expect(score).toBeGreaterThanOrEqual(previous);
          previous = score;
        }
      }
    }
  });

  it('is monotonic for accuracy at fixed rating and WPM', () => {
    const ratings: Array<number | null> = [null, 50, 700, 1300, 1900, 2600];
    const wpms = [10, 35, 55, 80, 110, 150];

    for (const rating of ratings) {
      for (const wpm of wpms) {
        let previous = -1;
        for (let accuracy = 0; accuracy <= 1; accuracy += 0.01) {
          const score = performanceScore({ wpm, accuracy, consistency: 1 }, rating);
          expect(score).toBeGreaterThanOrEqual(previous);
          previous = score;
        }
      }
    }
  });

  it('matches damage formula exactly and respects custom caps', () => {
    for (let a = -40; a <= 140; a += 2) {
      for (let b = -40; b <= 140; b += 2) {
        const expectedDefault = Math.min(70, Math.round(Math.max(0, a - b)));
        expect(damageFromScores(a, b)).toBe(expectedDefault);

        const expectedCustom = Math.min(25, Math.round(Math.max(0, a - b)));
        expect(damageFromScores(a, b, 25)).toBe(expectedCustom);
      }
    }
  });
});
