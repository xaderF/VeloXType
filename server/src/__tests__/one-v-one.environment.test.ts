import { describe, expect, it } from 'vitest';
import { generateText } from '../engine/text.js';
import {
  computeServerMetrics,
  roundCombatScore,
  damageFromScores,
} from '../engine/metrics.js';

function runRound(params: {
  seed: string;
  ratingA: number;
  ratingB: number;
  typedA: string;
  typedB: string;
}) {
  const target = generateText({
    seed: params.seed,
    length: 240,
    difficulty: 'medium',
    includePunctuation: false,
  });

  const metricsA = computeServerMetrics(target, params.typedA, 30_000, [], 30_000);
  const metricsB = computeServerMetrics(target, params.typedB, 30_000, [], 30_000);

  const scoreA = roundCombatScore(metricsA.wpm, metricsA.accuracy, params.ratingA);
  const scoreB = roundCombatScore(metricsB.wpm, metricsB.accuracy, params.ratingB);
  const dmgA = damageFromScores(scoreA, scoreB);
  const dmgB = damageFromScores(scoreB, scoreA);

  return { scoreA, scoreB, dmgA, dmgB };
}

describe('1v1 environment simulation', () => {
  it('produces no damage for identical performance', () => {
    const target = generateText({ seed: 'draw-seed', length: 240 });
    const typed = target.slice(0, 170);
    const result = runRound({
      seed: 'draw-seed',
      ratingA: 1200,
      ratingB: 1200,
      typedA: typed,
      typedB: typed,
    });

    expect(result.scoreA).toBe(result.scoreB);
    expect(result.dmgA).toBe(0);
    expect(result.dmgB).toBe(0);
  });

  it('awards damage to the stronger performer and mirrors on swap', () => {
    const target = generateText({ seed: 'swap-seed', length: 240 });
    const stronger = target.slice(0, 220);
    const weaker = target.slice(0, 140);

    const first = runRound({
      seed: 'swap-seed',
      ratingA: 1000,
      ratingB: 1000,
      typedA: stronger,
      typedB: weaker,
    });

    const swapped = runRound({
      seed: 'swap-seed',
      ratingA: 1000,
      ratingB: 1000,
      typedA: weaker,
      typedB: stronger,
    });

    expect(first.scoreA).toBeGreaterThan(first.scoreB);
    expect(first.dmgA).toBeGreaterThan(0);
    expect(first.dmgB).toBe(0);
    expect(swapped.dmgB).toBe(first.dmgA);
    expect(swapped.dmgA).toBe(0);
  });

  it('keeps 1v1 damage bounded for many seeds', () => {
    for (let i = 0; i < 400; i += 1) {
      const target = generateText({ seed: `mass-${i}`, length: 240 });
      const strong = target.slice(0, 230);
      const medium = target.slice(0, 185);
      const weak = target.slice(0, 130);

      const aVsB = runRound({
        seed: `mass-${i}`,
        ratingA: 900,
        ratingB: 900,
        typedA: strong,
        typedB: medium,
      });
      const bVsC = runRound({
        seed: `mass-${i}`,
        ratingA: 900,
        ratingB: 900,
        typedA: medium,
        typedB: weak,
      });

      expect(aVsB.dmgA).toBeGreaterThanOrEqual(0);
      expect(aVsB.dmgA).toBeLessThanOrEqual(70);
      expect(aVsB.dmgB).toBeGreaterThanOrEqual(0);
      expect(aVsB.dmgB).toBeLessThanOrEqual(70);
      expect(bVsC.dmgA).toBeGreaterThanOrEqual(0);
      expect(bVsC.dmgA).toBeLessThanOrEqual(70);
      expect(bVsC.dmgB).toBeGreaterThanOrEqual(0);
      expect(bVsC.dmgB).toBeLessThanOrEqual(70);
    }
  });
});
