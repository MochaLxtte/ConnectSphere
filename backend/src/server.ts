import { createRuntimeApp } from './runtime-app.js';
import { loadEnvironment } from './config/env.js';
import { createDatabasePool } from './db/pool.js';
import { startHoldExpiryScheduler } from './modules/venues/hold-expiry-scheduler.js';

const environment = loadEnvironment();
const pool = createDatabasePool(environment.databaseUrl);
const app = createRuntimeApp({
  pool,
  isProduction: environment.nodeEnv === 'production',
});

// KAN-83: expire overdue venue holds at startup and every minute (database clock).
const stopHoldExpiry = startHoldExpiryScheduler(pool);

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

  stopHoldExpiry();
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
