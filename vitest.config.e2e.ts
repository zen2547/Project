import 'dotenv/config';
import { defineConfig } from 'vitest/config';
import { resolveTestDatabaseUrl } from './test/helpers/test-database-url.js';

// Point the whole e2e run at imdb_test. process.env wins over .env in
// ConfigModule, so the app under test never sees the dev DATABASE_URL.
const testDatabaseUrl = resolveTestDatabaseUrl(process.env);

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    env: { DATABASE_URL: testDatabaseUrl },
    globalSetup: ['test/helpers/global-setup.ts'],
    // Every file shares one database, so run files one at a time.
    fileParallelism: false,
    hookTimeout: 30_000,
  },
});
