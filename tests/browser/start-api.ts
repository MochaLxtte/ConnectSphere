import { browserApiEnvironment, browserTestDatabaseUrl } from './environment.js';

// Validate before any project import can load .env or open a connection.
const databaseUrl = browserTestDatabaseUrl(process.env.TEST_DATABASE_URL);
Object.assign(process.env, browserApiEnvironment(databaseUrl, process.env));
const { migrate } = await import('../../database/migrate.js');
const { seed } = await import('../../database/seed.js');
await migrate(databaseUrl);
await seed(databaseUrl);

// Use normal production route composition/startup, including the scheduler, only on the test DB.
await import('../../backend/src/server.js');
