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
        reporter: ['text', 'html'],
        include: ['src/lib/**/*.ts', 'src/features/system/**/*.{ts,vue}', 'src/features/reviews/**/*.{ts,vue}', 'src/features/events/**/*.{ts,vue}', 'src/features/venues/**/*.{ts,vue}', 'src/features/notifications/**/*.{ts,vue}', 'src/features/equipment/**/*.{ts,vue}', 'src/features/registrations/**/*.{ts,vue}'],
        exclude: ['**/*.test.ts'],
      },
    },
  };
});
