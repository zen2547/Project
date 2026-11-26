import { envSchema } from './env.schema.js';

const valid = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/imdb_dev',
  JWT_SECRET: 'x'.repeat(32),
  JWT_EXPIRES_IN: '3600',
};

describe('envSchema', () => {
  it('accepts a complete env and coerces numbers', () => {
    const env = envSchema.parse(valid);
    expect(env.JWT_EXPIRES_IN).toBe(3600);
    expect(env.PORT).toBe(3000);
  });

  it.each(['DATABASE_URL', 'JWT_SECRET', 'JWT_EXPIRES_IN'] as const)(
    'rejects a missing %s',
    (key) => {
      const { [key]: _omitted, ...rest } = valid;
      expect(envSchema.safeParse(rest).success).toBe(false);
    },
  );

  it('rejects a JWT_SECRET shorter than 32 characters', () => {
    const result = envSchema.safeParse({ ...valid, JWT_SECRET: 'short' });
    expect(result.success).toBe(false);
  });
});
