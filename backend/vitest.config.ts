import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/server.ts'], // Process entry point is exercised by the isolated browser server.
      reporter: ['text', 'lcov', 'json-summary'],
      // Isolated tests deliberately leave real transaction paths to the combined DB coverage job.
      thresholds: {
        statements: 90, branches: 89, functions: 91, lines: 90,
        'src/modules/auth/supabase.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
        'src/db/pool.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
      },
    },
  },
});
