import 'dotenv/config';
import { execSync } from 'node:child_process';
import { resolveTestDatabaseUrl } from './test-database-url.js';

// Runs once before all e2e files: bring imdb_test up to the latest migration.
export default function setup() {
  const url = resolveTestDatabaseUrl(process.env);
  execSync('pnpm exec prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'pipe',
  });
}
