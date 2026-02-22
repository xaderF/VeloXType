import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'server/src/__tests__/ws-rate-limit.latency.test.ts',
      'server/src/__tests__/server.e2e.test.ts',
      'server/src/__tests__/one-v-one.environment.test.ts',
      'server/src/__tests__/matches.db-retrieval.test.ts',
    ],
  },
});
