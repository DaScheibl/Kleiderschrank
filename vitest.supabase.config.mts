import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

// Integrationstests gegen das echte Supabase-Projekt. Nur bei Bedarf: npm run test:supabase
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['src/**/*.itest.ts'],
    environment: 'node',
    env: loadEnv('', process.cwd(), 'EXPO_PUBLIC_'),
    testTimeout: 60_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
