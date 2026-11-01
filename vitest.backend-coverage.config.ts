import { defineConfig } from 'vitest/config';

// Measure the same owned backend source across isolated/HTTP tests and real PostgreSQL
// tests in one run. This does not instrument SQL or the external Supabase service.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['backend/test/**/*.test.ts', 'database/tests/**/*.integration.test.ts'],
    testTimeout: 15000,
    hookTimeout: 30000,
    fileParallelism: false,
    pool: 'threads',
    coverage: {
      provider: 'v8',
      include: ['backend/src/**/*.ts'],
      // server.ts is the process entry point, exercised by the owned browser server.
      // Runtime constants in types.ts are included; pure type declarations add no executable code.
      exclude: ['backend/src/server.ts'],
      reportsDirectory: 'backend/coverage-combined',
      reporter: ['text', 'html', 'json', 'json-summary', 'lcov'],
      thresholds: {
        statements: 99, branches: 97, functions: 99, lines: 99,
      },
    },
  },
});
