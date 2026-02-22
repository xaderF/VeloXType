import { env } from './env.js';
import { buildServer } from './app.js';

const app = await buildServer();

// ---------------------------------------------------------------------------
// Process-level crash handlers
// ---------------------------------------------------------------------------
process.on('uncaughtException', (err) => {
  app.log.fatal({ err }, 'Uncaught exception — shutting down');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  app.log.fatal({ err: reason }, 'Unhandled promise rejection — shutting down');
  process.exit(1);
});

const port = env.PORT;

app.listen({ port, host: '0.0.0.0' })
  .then(() => {
    app.log.info(`Server running on :${port} (env: ${env.NODE_ENV})`);
  })
  .catch((err: unknown) => {
    app.log.error(err);
    process.exit(1);
  });
