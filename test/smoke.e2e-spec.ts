import request from 'supertest';
import { closeTestApp, createTestApp, TestContext } from './helpers/app.js';
import { resetDatabase } from './helpers/db.js';

describe('smoke (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  it('boots against the test database, never imdb_dev', async () => {
    const [{ db }] = await ctx.prisma.$queryRaw<{ db: string }[]>`
      SELECT current_database() AS db
    `;
    expect(db).toMatch(/_test$/);
  });

  it('answers an unknown route with 404 in the API error shape', async () => {
    const res = await request(ctx.http).get('/does-not-exist').expect(404);
    expect(res.body).toEqual({ message: 'Cannot GET /does-not-exist' });
  });

  it('resetDatabase empties tables and restarts ids', async () => {
    await ctx.prisma.$executeRawUnsafe(
      'CREATE TABLE IF NOT EXISTS e2e_scratch (id SERIAL PRIMARY KEY, note TEXT)',
    );
    try {
      await ctx.prisma.$executeRawUnsafe(
        "INSERT INTO e2e_scratch (note) VALUES ('a'), ('b')",
      );

      await resetDatabase(ctx.prisma);

      const [{ count }] = await ctx.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) AS count FROM e2e_scratch
      `;
      expect(count).toBe(0n);

      const [{ id }] = await ctx.prisma.$queryRaw<{ id: number }[]>`
        INSERT INTO e2e_scratch (note) VALUES ('c') RETURNING id
      `;
      expect(id).toBe(1);
    } finally {
      await ctx.prisma.$executeRawUnsafe('DROP TABLE IF EXISTS e2e_scratch');
    }
  });
});
