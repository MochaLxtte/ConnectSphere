import { fileURLToPath } from 'node:url';
import { build, preview } from 'vite';

// Build once rather than recompiling hundreds of source modules during concurrent navigations.
// Neither the developer's .env nor inherited VITE_* values belong in this isolated fixture build.
for (const key of Object.keys(process.env)) {
  if (key.startsWith('VITE_')) delete process.env[key];
}
process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:4311';
process.env.VITE_SUPABASE_ANON_KEY = 'browser-fixtures-only';
process.env.API_PROXY_TARGET = 'http://127.0.0.1:4311';
const root = fileURLToPath(new URL('../../frontend/', import.meta.url));
const outDir = fileURLToPath(new URL('../../node_modules/.cache/connectsphere-browser/dist/', import.meta.url));

await build({
  root,
  configFile: fileURLToPath(new URL('../../frontend/vite.config.ts', import.meta.url)),
  mode: 'browser-test',
  envDir: false,
  build: { outDir, emptyOutDir: true },
  logLevel: 'warn',
});
await preview({
  root,
  configFile: false,
  envDir: false,
  build: { outDir },
  preview: {
    host: '127.0.0.1', port: 4173, strictPort: true,
    proxy: { '/api': { target: 'http://127.0.0.1:4311', changeOrigin: true } },
  },
});
