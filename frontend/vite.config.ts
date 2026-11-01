import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, repositoryRoot, '');
  return {
    plugins: [vue()],
    envDir: repositoryRoot,
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target:
            process.env.API_PROXY_TARGET || environment.API_PROXY_TARGET || 'http://127.0.0.1:3000',
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      clearMocks: true,
      restoreMocks: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'json', 'json-summary', 'lcov'],
        include: ['src/**/*.{ts,vue}'],
        exclude: [
          '**/*.test.ts', // Test assertions are not product code.
          '**/*.d.ts', // Type declarations have no executable implementation.
          'src/test/**', // Test setup/cleanup only.
          'src/features/events/components/test-api.ts', // Shared fetch fixture, imported only by tests.
        ],
        // Regression floors against the full owned-source denominator, not a claim of 100% coverage.
        thresholds: {
          statements: 95, branches: 92, functions: 97, lines: 98,
          'src/features/auth/session.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
          'src/features/auth/supabase-client.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
          'src/features/auth/pages/LoginPage.vue': { statements: 100, branches: 100, functions: 100, lines: 100 },
          'src/app/router.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
          'src/components/AppShell.vue': { statements: 100, branches: 100, functions: 100, lines: 100 },
        },
      },
    },
  };
});
