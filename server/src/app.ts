import { randomUUID } from 'crypto';
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import { env } from './env.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { profileRoutes } from './routes/profile.js';
import { matchRoutes } from './routes/matches.js';
import { leaderboardRoutes } from './routes/leaderboard.js';
import { matchmakingWs } from './ws/matchmaking.js';
import { liveMatchWs } from './ws/live-match.js';

export interface BuildServerOptions {
  withWebSockets?: boolean;
  withAuthRoutes?: boolean;
  fastify?: FastifyServerOptions;
}

function normalizeOrigin(value: string) {
  return value.trim().replace(/\/+$/, '');
}

function matchesOrigin(candidateOrigin: string, allowedOrigin: string) {
  const normalizedCandidate = normalizeOrigin(candidateOrigin);
  const normalizedAllowed = normalizeOrigin(allowedOrigin);

  if (normalizedAllowed === '*') return true;
  if (normalizedCandidate === normalizedAllowed) return true;

  if (normalizedAllowed.includes('*')) {
    const wildcardPattern = `^${normalizedAllowed
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\\\*/g, '.*')}$`;
    return new RegExp(wildcardPattern, 'i').test(normalizedCandidate);
  }

  return false;
}

export async function buildServer(options: BuildServerOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: true,
    genReqId: () => randomUUID(),
    requestIdHeader: 'x-request-id',
    ...options.fastify,
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error(
      { err: error, reqId: request.id, url: request.url, method: request.method },
      'Unhandled route error',
    );

    const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
    reply.status(statusCode).send({
      error: statusCode >= 500 ? 'Internal Server Error' : (error as Error).message,
    });
  });

  app.addHook('onRequest', async (request) => {
    request.log = request.log.child({ reqId: request.id });
  });

  app.addHook('onResponse', async (request, reply) => {
    request.log.info(
      { url: request.url, method: request.method, statusCode: reply.statusCode, responseTime: reply.elapsedTime },
      'request completed',
    );
  });

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'", 'wss:', 'ws:'],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
  });

  const allowedOrigins = env.CORS_ORIGIN
    ? env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
    : ['http://localhost:8080', 'http://127.0.0.1:8080'];

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) {
        cb(null, true);
        return;
      }

      const isAllowed = allowedOrigins.some((allowedOrigin) => matchesOrigin(origin, allowedOrigin));
      cb(null, isAllowed);
    },
    credentials: true,
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  if (options.withWebSockets ?? true) {
    await app.register(websocket);
  }

  await app.register(healthRoutes);
  if (options.withAuthRoutes ?? true) {
    await app.register(authRoutes);
  }
  await app.register(profileRoutes);
  await app.register(matchRoutes);
  await app.register(leaderboardRoutes);

  if (options.withWebSockets ?? true) {
    await app.register(matchmakingWs);
    await app.register(liveMatchWs);
  }

  return app;
}
