import { createApp } from './app.js';
import { loadEnvironment } from './config/env.js';
import { createDatabasePool } from './db/pool.js';

const environment = loadEnvironment();
const pool = createDatabasePool(environment.databaseUrl);
const app = createApp({ database: pool });

const server = app.listen(environment.apiPort, environment.apiHost, () => {
  console.info(
    `ConnectSphere API listening at http://${environment.apiHost}:${environment.apiPort}`,
  );
});

let shuttingDown = false;
async function shutdown(exitCode = 0): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  const timeout = setTimeout(() => {
    server.closeAllConnections();
    process.exit(1);
  }, 10_000);
  timeout.unref();

  try {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await pool.end();
    clearTimeout(timeout);
    process.exitCode = exitCode;
  } catch {
    console.error('The API could not shut down cleanly.');
    process.exitCode = 1;
  }
}

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
server.on('error', async () => {
  console.error(
    'The API could not listen. Check API_HOST, API_PORT, and whether the port is already in use.',
  );
  await pool.end();
  process.exitCode = 1;
});
