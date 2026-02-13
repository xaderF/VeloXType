import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { getBearerToken, verifyAuthToken, verifyPassword, revokeToken, decryptPii, encryptPii, hashEmailForLookup, normalizeEmail } from '../auth.js';
import { prisma } from '../db.js';

const DATABASE_UNAVAILABLE_MESSAGE = 'Database is not configured. Set DATABASE_URL and run migrations.';

function sendDatabaseUnavailable(reply: FastifyReply) {
  return reply.status(503).send({ error: DATABASE_UNAVAILABLE_MESSAGE });
}

export async function profileRoutes(app: FastifyInstance) {
  if (!prisma) {
    app.get('/profile', async (_request: FastifyRequest, reply: FastifyReply) => sendDatabaseUnavailable(reply));
    app.get('/profile/stats', async (_request: FastifyRequest, reply: FastifyReply) => sendDatabaseUnavailable(reply));
    app.patch('/profile', async (_request: FastifyRequest, reply: FastifyReply) => sendDatabaseUnavailable(reply));
    app.get('/profile/export', async (_request: FastifyRequest, reply: FastifyReply) => sendDatabaseUnavailable(reply));
    app.delete('/profile', async (_request: FastifyRequest, reply: FastifyReply) => sendDatabaseUnavailable(reply));
    return;
  }

  const db = prisma;

  const profileUpdateSchema = z.object({
    username: z
      .string()
      .trim()
      .min(3)
      .max(24)
      .regex(/^[A-Za-z0-9_]+$/, 'Username may only include letters, numbers, and underscores')
      .optional(),
    email: z.string().trim().email().optional(),
    settings: z.record(z.string(), z.unknown()).optional(),
  });

  app.get('/profile', async (request: FastifyRequest, reply: FastifyReply) => {
    const token = getBearerToken(request.headers.authorization);
    const authUser = token ? verifyAuthToken(token) : null;
    if (!authUser) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const profile = await db.user.findUnique({
      where: { id: authUser.id },
      include: { rating: true },
    });
    if (!profile) {
      return reply.status(404).send({ error: 'Profile not found' });
    }

    return {
      id: profile.id,
      username: profile.username,
      role: profile.role,
      email: profile.email ? decryptPii(profile.email) : null,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      rating: profile.rating?.rating ?? null,
      competitiveElo: profile.rating?.competitiveElo ?? null,
      placementGamesPlayed: profile.rating?.placementGamesPlayed ?? 0,
      settings: profile.settings,
    };
  });

  // -------------------------------------------------------------------------
  // GET /profile/stats — aggregate match stats for the authenticated user
  // Uses DB-level aggregation instead of loading all rows into JS.
  // -------------------------------------------------------------------------
  app.get('/profile/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    const token = getBearerToken(request.headers.authorization);
    const authUser = token ? verifyAuthToken(token) : null;
    if (!authUser) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    // Run aggregate + groupBy + recent-20 in parallel
    const [aggregates, resultCounts, recentMatches] = await Promise.all([
      // 1) Averages & max in one DB pass
      db.matchPlayer.aggregate({
        where: { userId: authUser.id, result: { not: null } },
        _count: { _all: true },
        _avg: { wpm: true, accuracy: true, consistency: true },
        _max: { wpm: true },
      }),
      // 2) Win/loss/draw counts via groupBy
      db.matchPlayer.groupBy({
        by: ['result'],
        where: { userId: authUser.id, result: { not: null } },
        _count: { _all: true },
      }),
      // 3) Only the 20 most-recent matches for the sparkline
      db.matchPlayer.findMany({
        where: { userId: authUser.id, result: { not: null }, ratingDelta: { not: null } },
        select: {
          ratingDelta: true,
          match: { select: { createdAt: true } },
        },
        orderBy: { match: { createdAt: 'desc' } },
        take: 20,
      }),
    ]);

    const total = aggregates._count._all;
    const countMap = Object.fromEntries(
      resultCounts.map((r) => [r.result, r._count._all]),
    );
    const wins = countMap['win'] ?? 0;
    const losses = countMap['loss'] ?? 0;
    const draws = countMap['draw'] ?? 0;

    const round = (v: number | null, decimals: number) =>
      v != null ? Math.round(v * 10 ** decimals) / 10 ** decimals : 0;

    const recentRatings = recentMatches
      .map((m) => ({ delta: m.ratingDelta!, date: m.match.createdAt }))
      .reverse(); // oldest first for graph

    return {
      totalMatches: total,
      wins,
      losses,
      draws,
      winRate: total > 0 ? Math.round((wins / total) * 1000) / 10 : 0,
      avgWpm: round(aggregates._avg.wpm, 2),
      bestWpm: round(aggregates._max.wpm, 2),
      avgAccuracy: round(aggregates._avg.accuracy, 4),
      avgConsistency: round(aggregates._avg.consistency, 4),
      recentRatings,
    };
  });

  app.patch('/profile', async (request: FastifyRequest, reply: FastifyReply) => {
    const token = getBearerToken(request.headers.authorization);
    const authUser = token ? verifyAuthToken(token) : null;
    if (!authUser) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const parsed = profileUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid payload' });
    }

    const nextUsername = parsed.data.username?.toLowerCase();
    const nextEmail = parsed.data.email ? normalizeEmail(parsed.data.email) : undefined;
    const dataToUpdate: {
      username?: string;
      email?: string | null;
      emailHash?: string | null;
      settings?: Prisma.InputJsonValue;
    } = {};

    if (nextUsername) {
      const existing = await db.user.findUnique({
        where: { username: nextUsername },
        select: { id: true },
      });
      if (existing && existing.id !== authUser.id) {
        return reply.status(409).send({ error: 'Username already taken' });
      }
      dataToUpdate.username = nextUsername;
    }

    if (nextEmail !== undefined) {
      const nextEmailHash = hashEmailForLookup(nextEmail);
      const existing = await db.user.findUnique({
        where: { emailHash: nextEmailHash },
        select: { id: true },
      });
      if (existing && existing.id !== authUser.id) {
        return reply.status(409).send({ error: 'Email already in use' });
      }
      dataToUpdate.email = encryptPii(nextEmail);
      dataToUpdate.emailHash = nextEmailHash;
    }

    if (parsed.data.settings !== undefined) {
      dataToUpdate.settings = parsed.data.settings as Prisma.InputJsonValue;
    }

    const updated = await db.user.update({
      where: { id: authUser.id },
      data: dataToUpdate,
      include: { rating: true },
    });

    return {
      id: updated.id,
      username: updated.username,
      role: updated.role,
      email: updated.email ? decryptPii(updated.email) : null,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      rating: updated.rating?.rating ?? null,
      competitiveElo: updated.rating?.competitiveElo ?? null,
      settings: updated.settings,
    };
  });

  // -------------------------------------------------------------------------
  // GET /profile/export — GDPR data portability (Article 20)
  // Returns all personal data associated with the authenticated user.
  // -------------------------------------------------------------------------
  app.get('/profile/export', async (request: FastifyRequest, reply: FastifyReply) => {
    const token = getBearerToken(request.headers.authorization);
    const authUser = token ? verifyAuthToken(token) : null;
    if (!authUser) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const user = await db.user.findUnique({
      where: { id: authUser.id },
      include: {
        rating: true,
        matches: {
          include: { match: { select: { id: true, seed: true, mode: true, limit: true, status: true, createdAt: true } } },
          orderBy: { createdAt: 'desc' },
        },
        dailyScores: { orderBy: { date: 'desc' } },
      },
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      account: {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email ? decryptPii(user.email) : null,
        oauthProvider: user.oauthProvider,
        settings: user.settings,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      rating: user.rating
        ? {
            rating: user.rating.rating,
            competitiveElo: user.rating.competitiveElo,
            placementGamesPlayed: user.rating.placementGamesPlayed,
          }
        : null,
      matches: user.matches.map((mp) => ({
        matchId: mp.matchId,
        mode: mp.match.mode,
        limit: mp.match.limit,
        status: mp.match.status,
        playedAt: mp.match.createdAt,
        wpm: mp.wpm,
        rawWpm: mp.rawWpm,
        accuracy: mp.accuracy,
        consistency: mp.consistency,
        score: mp.score,
        result: mp.result,
        damageDealt: mp.damageDealt,
        damageTaken: mp.damageTaken,
        errors: mp.errors,
        correctChars: mp.correctChars,
        totalTyped: mp.totalTyped,
        ratingBefore: mp.ratingBefore,
        ratingAfter: mp.ratingAfter,
        ratingDelta: mp.ratingDelta,
      })),
      dailyScores: user.dailyScores.map((ds) => ({
        date: ds.date,
        wpm: ds.wpm,
        rawWpm: ds.rawWpm,
        accuracy: ds.accuracy,
        consistency: ds.consistency,
        score: ds.score,
        correctChars: ds.correctChars,
        totalTyped: ds.totalTyped,
        errors: ds.errors,
        createdAt: ds.createdAt,
      })),
    };

    reply.header('Content-Disposition', `attachment; filename="veloxtype-data-export-${authUser.id}.json"`);
    reply.header('Content-Type', 'application/json');
    return exportData;
  });

  // -------------------------------------------------------------------------
  // DELETE /profile — GDPR right to erasure (Article 17)
  // Permanently deletes the user and all associated data.
  // Requires password re-entry for security.
  // -------------------------------------------------------------------------
  const deleteBodySchema = z.object({
    password: z.string().min(1).optional(),
  }).optional();

  const handleDeleteProfile = async (request: FastifyRequest, reply: FastifyReply) => {
    const token = getBearerToken(request.headers.authorization);
    const authUser = token ? verifyAuthToken(token) : null;
    if (!authUser) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    // Verify user exists and get password hash
    const user = await db.user.findUnique({ where: { id: authUser.id }, select: { id: true, passwordHash: true } });
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    // Require password re-entry for password-based accounts
    if (user.passwordHash) {
      const body = deleteBodySchema.safeParse(request.body);
      const password = body.success && body.data ? body.data.password : null;
      if (!password || !verifyPassword(password, user.passwordHash)) {
        return reply.status(403).send({ error: 'Incorrect password' });
      }
    }

    // Cascade delete all user-owned data in the correct order
    await db.$transaction([
      db.dailyScore.deleteMany({ where: { userId: authUser.id } }),
      db.matchPlayer.deleteMany({ where: { userId: authUser.id } }),
      db.rating.deleteMany({ where: { userId: authUser.id } }),
      db.user.delete({ where: { id: authUser.id } }),
    ]);

    // Revoke the current token
    if (token) revokeToken(token);

    return reply.status(200).send({ success: true, message: 'Account and all associated data have been permanently deleted.' });
  };

  app.delete('/profile', handleDeleteProfile);
  // Also support POST for clients/proxies that mishandle DELETE request bodies.
  app.post('/profile/delete', handleDeleteProfile);
}
