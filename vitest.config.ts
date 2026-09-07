import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
    env: {
      INSTAGRAM_PROVIDER: 'mock',
      PGLITE_PATH: ':memory:',
      DATABASE_URL: '',
      REDIS_URL: '',
      TOKEN_ENCRYPTION_KEY: 'a'.repeat(64),
    },
  },
});
