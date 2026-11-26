import { resolveTestDatabaseUrl } from './test-database-url.js';

const dev = 'postgresql://u:p@localhost:5432/imdb_dev';
const test = 'postgresql://u:p@localhost:5432/imdb_test';

describe('resolveTestDatabaseUrl', () => {
  it('returns TEST_DATABASE_URL when it is a separate *_test database', () => {
    expect(
      resolveTestDatabaseUrl({ DATABASE_URL: dev, TEST_DATABASE_URL: test }),
    ).toBe(test);
  });

  it('throws when TEST_DATABASE_URL is missing', () => {
    expect(() => resolveTestDatabaseUrl({ DATABASE_URL: dev })).toThrow(
      /not set/,
    );
  });

  it('throws when it equals DATABASE_URL', () => {
    expect(() =>
      resolveTestDatabaseUrl({ DATABASE_URL: test, TEST_DATABASE_URL: test }),
    ).toThrow(/must differ/);
  });

  it('throws when the database name does not end in _test', () => {
    expect(() =>
      resolveTestDatabaseUrl({
        DATABASE_URL: dev,
        TEST_DATABASE_URL: dev.replace('dev', 'prod'),
      }),
    ).toThrow(/Refusing/);
  });
});
