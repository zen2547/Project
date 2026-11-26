// Guard rail: e2e tests TRUNCATE every table, so refuse to run unless we are
// certain the target is a dedicated test database.
export function resolveTestDatabaseUrl(env: NodeJS.ProcessEnv): string {
  const testUrl = env['TEST_DATABASE_URL'];
  if (!testUrl) {
    throw new Error('TEST_DATABASE_URL is not set (see .env.example).');
  }
  if (testUrl === env['DATABASE_URL']) {
    throw new Error('TEST_DATABASE_URL must differ from DATABASE_URL.');
  }
  const dbName = new URL(testUrl).pathname.slice(1);
  if (!dbName.endsWith('_test')) {
    throw new Error(
      `Refusing to run e2e tests on "${dbName}": the database name must end in "_test".`,
    );
  }
  return testUrl;
}
