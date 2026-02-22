import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { matchRoutes, type MatchRoutesDeps } from '../routes/matches.js';

describe('matches route database retrieval', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps /matches rows into API response shape', async () => {
    const createdAt = new Date('2026-02-20T10:00:00.000Z');
    const count = vi.fn(async () => 1);
    const findMany = vi.fn(async () => [
      {
        userId: 'u1',
        wpm: 80,
        accuracy: 0.98,
        consistency: 0.88,
        score: 82,
        result: 'win',
        damageDealt: 21,
        damageTaken: 5,
        rawWpm: 86,
        errors: 2,
        ratingBefore: 1200,
        ratingAfter: 1216,
        ratingDelta: 16,
        match: {
          id: 'm1',
          createdAt,
          mode: 'time',
          limit: 30,
          status: 'completed',
          seed: 'seed-1',
          players: [
            {
              userId: 'u1',
              wpm: 80,
              accuracy: 0.98,
              consistency: 0.88,
              score: 82,
              result: 'win',
              user: {
                username: 'alpha',
                rating: { rating: 1216, competitiveElo: 0 },
              },
            },
            {
              userId: 'u2',
              wpm: 73,
              accuracy: 0.94,
              consistency: 0.8,
              score: 61,
              result: 'loss',
              user: {
                username: 'beta',
                rating: { rating: 1190, competitiveElo: 0 },
              },
            },
          ],
        },
      },
    ]);

    const deps: MatchRoutesDeps = {
      db: {
        matchPlayer: { count, findMany },
        match: { findFirst: vi.fn(async () => null) },
      },
      getBearerToken: () => 'token-1',
      verifyAuthToken: () => ({ id: 'u1', username: 'alpha', role: 'USER' }),
    };

    const app = Fastify({ logger: false });
    await app.register(matchRoutes, deps as never);

    const response = await app.inject({
      method: 'GET',
      url: '/matches?limit=20&offset=0',
      headers: { authorization: 'Bearer token-1' },
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json() as {
      total: number;
      matches: Array<{
        matchId: string;
        seed: string;
        you: { userId: string; ratingDelta: number | null };
        opponent: { userId: string; username: string; rating: number | null } | null;
      }>;
    };

    expect(payload.total).toBe(1);
    expect(payload.matches[0].matchId).toBe('m1');
    expect(payload.matches[0].seed).toBe('seed-1');
    expect(payload.matches[0].you.userId).toBe('u1');
    expect(payload.matches[0].you.ratingDelta).toBe(16);
    expect(payload.matches[0].opponent).toEqual({
      userId: 'u2',
      username: 'beta',
      rating: 1190,
      competitiveElo: 0,
      wpm: 73,
      accuracy: 0.94,
      consistency: 0.8,
      score: 61,
      result: 'loss',
    });

    expect(count).toHaveBeenCalledTimes(1);
    expect(findMany).toHaveBeenCalledTimes(1);

    await app.close();
  });

  it('returns player-expanded payload for /matches/:matchId', async () => {
    const findFirst = vi.fn(async () => ({
      id: 'm2',
      seed: 'seed-2',
      mode: 'time',
      limit: 30,
      status: 'completed',
      createdAt: new Date('2026-02-20T11:00:00.000Z'),
      players: [
        {
          userId: 'u1',
          wpm: 90,
          accuracy: 0.99,
          consistency: 0.9,
          score: 88,
          result: 'win',
          damageDealt: 18,
          damageTaken: 4,
          rawWpm: 94,
          errors: 1,
          correctChars: 220,
          totalTyped: 225,
          ratingBefore: 1216,
          ratingAfter: 1234,
          ratingDelta: 18,
          progressSamples: [80, 83, 85],
          user: {
            username: 'alpha',
            rating: { rating: 1234, competitiveElo: 0 },
          },
        },
      ],
    }));

    const deps: MatchRoutesDeps = {
      db: {
        matchPlayer: {
          count: vi.fn(async () => 0),
          findMany: vi.fn(async () => []),
        },
        match: { findFirst },
      },
      getBearerToken: () => 'token-2',
      verifyAuthToken: () => ({ id: 'u1', username: 'alpha', role: 'USER' }),
    };

    const app = Fastify({ logger: false });
    await app.register(matchRoutes, deps as never);

    const response = await app.inject({
      method: 'GET',
      url: '/matches/m2',
      headers: { authorization: 'Bearer token-2' },
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json() as {
      id: string;
      players: Array<{ userId: string; username: string; ratingDelta: number | null }>;
    };
    expect(payload.id).toBe('m2');
    expect(payload.players).toHaveLength(1);
    expect(payload.players[0]).toMatchObject({
      userId: 'u1',
      username: 'alpha',
      ratingDelta: 18,
    });

    expect(findFirst).toHaveBeenCalledTimes(1);

    await app.close();
  });
});
