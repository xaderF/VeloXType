import { describe, expect, it } from 'vitest';
import { createTypingState, typingReducer } from '@/game/engine';

function makeDeterministicRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

describe('typing reducer stress', () => {
  it('maintains state invariants through long random action streams', () => {
    const rng = makeDeterministicRng(1337);
    const target = 'abcdefghijklmnopqrstuvwxyz '.repeat(90);
    let state = createTypingState(target, { mode: 'text', limit: 120 });
    let nowMs = 0;

    for (let i = 0; i < 7000; i += 1) {
      const roll = rng();
      if (roll < 0.68) {
        const shouldTypeCorrect = rng() < 0.8 && state.cursor < state.target.length;
        const char = shouldTypeCorrect
          ? state.target[state.cursor]
          : String.fromCharCode(97 + Math.floor(rng() * 26));
        nowMs += 8 + Math.floor(rng() * 16);
        state = typingReducer(state, {
          type: 'TYPE_CHAR',
          payload: { char, nowMs },
        });
      } else if (roll < 0.88) {
        nowMs += 5 + Math.floor(rng() * 12);
        state = typingReducer(state, {
          type: 'BACKSPACE',
          payload: { nowMs },
        });
      } else {
        nowMs += 25 + Math.floor(rng() * 120);
        state = typingReducer(state, {
          type: 'TICK',
          payload: { nowMs },
        });
      }

      expect(state.cursor).toBe(state.typed.length);
      expect(state.cursor).toBeGreaterThanOrEqual(0);
      expect(state.errors).toBeGreaterThanOrEqual(0);
      expect(state.totalErrors).toBeGreaterThanOrEqual(state.errors);
      expect(state.totalKeystrokes).toBeGreaterThanOrEqual(state.typed.length);
      expect(state.totalErrors).toBeLessThanOrEqual(state.totalKeystrokes);
      expect(state.samples.length).toBeLessThanOrEqual(240);

      if (state.status !== 'idle') {
        expect(state.startedAtMs).not.toBeNull();
      }
      if (state.status === 'finished') {
        expect(state.endedAtMs).not.toBeNull();
        expect(state.endedAtMs).toBeGreaterThanOrEqual(state.startedAtMs ?? 0);
      }
    }

    while (state.status !== 'finished' && state.cursor < state.target.length) {
      nowMs += 1;
      state = typingReducer(state, {
        type: 'TYPE_CHAR',
        payload: { char: state.target[state.cursor], nowMs },
      });
    }

    expect(state.status).toBe('finished');
    expect(state.cursor).toBe(state.target.length);
  });

  it('keeps timed rounds fixed to the configured duration under heavy traffic', () => {
    const rng = makeDeterministicRng(2026);
    const startMs = 50_000;
    const limitSeconds = 15;
    let nowMs = startMs;
    let state = createTypingState('a'.repeat(2500), { mode: 'time', limit: limitSeconds });

    state = typingReducer(state, { type: 'TICK', payload: { nowMs } });

    for (let i = 0; i < 6000; i += 1) {
      const roll = rng();
      if (roll < 0.72) {
        const char = rng() < 0.9 ? 'a' : 'b';
        nowMs += 3 + Math.floor(rng() * 9);
        state = typingReducer(state, { type: 'TYPE_CHAR', payload: { char, nowMs } });
      } else if (roll < 0.9) {
        nowMs += 2 + Math.floor(rng() * 6);
        state = typingReducer(state, { type: 'BACKSPACE', payload: { nowMs } });
      } else {
        nowMs += 30 + Math.floor(rng() * 120);
        state = typingReducer(state, { type: 'TICK', payload: { nowMs } });
      }

      if (state.status === 'finished') break;
    }

    expect(state.status).toBe('finished');
    expect(state.startedAtMs).toBe(startMs);
    expect(state.endedAtMs).toBe(startMs + (limitSeconds * 1000));
  });

  it('caps sample history at 240 entries during very long sessions', () => {
    let nowMs = 0;
    let state = createTypingState('x'.repeat(6000), { mode: 'text', limit: 600 });

    for (let i = 0; i < 1000; i += 1) {
      nowMs += 1000;
      state = typingReducer(state, {
        type: 'TYPE_CHAR',
        payload: { char: 'x', nowMs },
      });
      if (state.status === 'finished') break;
    }

    expect(state.samples.length).toBe(240);
    for (const sample of state.samples) {
      expect(Number.isFinite(sample)).toBe(true);
      expect(sample).toBeGreaterThanOrEqual(0);
    }
  });
});
