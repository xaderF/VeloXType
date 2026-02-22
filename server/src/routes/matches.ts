import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { getBearerToken, verifyAuthToken } from '../auth.js';
import { prisma } from '../db.js';

type AuthUser = {
  id: string;
  username: string;
  role: 'USER' | 'ADMIN';
};

interface MatchRoutesDb {
  matchPlayer: {
    count: (args: unknown) => Promise<number>;
    findMany: (args: unknown) => Promise<Array<{
      userId: string;
      wpm: number | null;
      accuracy: number | null;
      consistency: number | null;
      score: number | null;
      result: string | null;
      damageDealt: number | null;
      damageTaken: number | null;
      rawWpm: number | null;
      errors: number | null;
      ratingBefore: number | null;
      ratingAfter: number | null;
      ratingDelta: number | null;
      match: {
        id: string;
        createdAt: Date;
        mode: string;
        limit: number;
        status: string;
        seed: string;
        players: Array<{
          userId: string;
          wpm: number | null;
          accuracy: number | null;
          consistency: number | null;
          score: number | null;
          result: string | null;
          user: {
            username: string;
            rating: { rating: number | null; competitiveElo: number | null } | null;
          };
        }>;
      };
    }>>;
  };
  match: {
    findFirst: (args: unknown) => Promise<{
      id: string;
      seed: string;
      mode: string;
      limit: number;
      status: string;
      createdAt: Date;
      players: Array<{
        userId: string;
        wpm: number | null;
        accuracy: number | null;
        consistency: number | null;
        score: number | null;
        result: string | null;
        damageDealt: number | null;
        damageTaken: number | null;
        rawWpm: number | null;
        errors: number | null;
        correctChars: number | null;
        totalTyped: number | null;
        ratingBefore: number | null;
        ratingAfter: number | null;
        ratingDelta: number | null;
        progressSamples: unknown;
        user: {
          username: string;
          rating: { rating: number | null; competitiveElo: number | null } | null;
        };
      }>;
    } | null>;
  };
}

export interface MatchRoutesDeps {
  db?: MatchRoutesDb | null;
  getBearerToken?: (authorization?: string) => string | null;
  verifyAuthToken?: (token: string) => AuthUser | null;
}

const DATABASE_UNAVAILABLE_MESSAGE = 'Database is not configured. Set DATABASE_URL and run migrations.';

function sendDatabaseUnavailable(reply: FastifyReply) {
  return reply.status(503).send({ error: DATABASE_UNAVAILABLE_MESSAGE });
}

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function matchRoutes(app: FastifyInstance, deps: MatchRoutesDeps = {}) {
  const db = deps.db ?? prisma;
  const parseBearer = deps.getBearerToken ?? getBearerToken;
  const verifyToken = deps.verifyAuthToken ?? verifyAuthToken;

  if (!db) {
    app.get('/matches', async (_request: FastifyRequest, reply: FastifyReply) => sendDatabaseUnavailable(reply));
    app.get('/matches/:matchId', async (_request: FastifyRequest, reply: FastifyReply) => sendDatabaseUnavailable(reply));
    return;
  }

  app.get('/matches', async (request: FastifyRequest, reply: FastifyReply) => {
    const token = parseBearer(request.headers.authorization);
    const authUser = token ? verifyToken(token) : null;
    if (!authUser) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const parsedQuery = listQuerySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      return reply.status(400).send({ error: 'Invalid query params' });
    }

    const { limit, offset } = parsedQuery.data;

    const total = await db.matchPlayer.count({
      where: {
        userId: authUser.id,
        result: { not: null },
      },
    });
    const rows = await db.matchPlayer.findMany({
      where: {
        userId: authUser.id,
        result: { not: null },
      },
      include: {
        match: {
          include: {
            players: {
              include: {
                user: {
                  include: {
                    rating: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        match: {
          createdAt: 'desc',
        },
      },
      skip: offset,
      take: limit,
    });

    return {
      total,
      limit,
      offset,
      matches: rows.map((row) => {
        const opponent = row.match.players.find((player) => player.userId !== authUser.id);
        return {
          matchId: row.match.id,
          createdAt: row.match.createdAt,
          mode: row.match.mode,
          limit: row.match.limit,
          status: row.match.status,
          seed: row.match.seed,
          you: {
            userId: row.userId,
            wpm: row.wpm,
            accuracy: row.accuracy,
            consistency: row.consistency,
            score: row.score,
            result: row.result,
            damageDealt: row.damageDealt,
            damageTaken: row.damageTaken,
            rawWpm: row.rawWpm,
            errors: row.errors,
            ratingBefore: row.ratingBefore,
            ratingAfter: row.ratingAfter,
            ratingDelta: row.ratingDelta,
          },
          opponent: opponent
            ? {
              userId: opponent.userId,
              username: opponent.user.username,
              rating: opponent.user.rating?.rating ?? null,
              competitiveElo: opponent.user.rating?.competitiveElo ?? null,
              wpm: opponent.wpm,
              accuracy: opponent.accuracy,
              consistency: opponent.consistency,
              score: opponent.score,
              result: opponent.result,
            }
            : null,
        };
      }),
    };
  });

  app.get('/matches/:matchId', async (request: FastifyRequest, reply: FastifyReply) => {
    const token = parseBearer(request.headers.authorization);
    const authUser = token ? verifyToken(token) : null;
    if (!authUser) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const params = z.object({ matchId: z.string().trim().min(1).max(128) }).safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid match id' });
    }

    const match = await db.match.findFirst({
      where: {
        id: params.data.matchId,
        players: {
          some: { userId: authUser.id },
        },
      },
      include: {
        players: {
          include: {
            user: {
              include: {
                rating: true,
              },
            },
          },
        },
      },
    });

    if (!match) {
      return reply.status(404).send({ error: 'Match not found' });
    }

    return {
      id: match.id,
      seed: match.seed,
      mode: match.mode,
      limit: match.limit,
      status: match.status,
      createdAt: match.createdAt,
      players: match.players.map((player) => ({
        userId: player.userId,
        username: player.user.username,
        rating: player.user.rating?.rating ?? null,
        competitiveElo: player.user.rating?.competitiveElo ?? null,
        wpm: player.wpm,
        accuracy: player.accuracy,
        consistency: player.consistency,
        score: player.score,
        result: player.result,
        damageDealt: player.damageDealt,
        damageTaken: player.damageTaken,
        rawWpm: player.rawWpm,
        errors: player.errors,
        correctChars: player.correctChars,
        totalTyped: player.totalTyped,
        ratingBefore: player.ratingBefore,
        ratingAfter: player.ratingAfter,
        ratingDelta: player.ratingDelta,
        progressSamples: player.progressSamples,
      })),
    };
  });
}
