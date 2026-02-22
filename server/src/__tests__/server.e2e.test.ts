import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../app.js';

describe('server e2e (inject)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildServer({
      withWebSockets: false,
      withAuthRoutes: false,
      fastify: { logger: false },
    });

    app.get('/__test__/teapot', async () => {
      const err = new Error('teapot') as Error & { statusCode?: number };
      err.statusCode = 418;
      throw err;
    });

    app.get('/__test__/panic', async () => {
      throw new Error('panic');
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves /health with expected shape and request id', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect([200, 503]).toContain(response.statusCode);
    expect(typeof response.headers['x-content-type-options']).toBe('string');

    const payload = response.json() as {
      status: string;
      uptime: number;
      timestamp: string;
      heapUsedMB: number;
      checks: { database?: string };
    };

    expect(['ok', 'degraded']).toContain(payload.status);
    expect(typeof payload.uptime).toBe('number');
    expect(typeof payload.timestamp).toBe('string');
    expect(typeof payload.heapUsedMB).toBe('number');
    expect(['ok', 'unreachable', 'not_configured']).toContain(payload.checks.database);
  });

  it('applies global error handler for 4xx-like thrown errors', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/__test__/teapot',
    });

    expect(response.statusCode).toBe(418);
    expect(response.json()).toEqual({ error: 'teapot' });
  });

  it('hides internal error message for 5xx thrown errors', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/__test__/panic',
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: 'Internal Server Error' });
  });
});
