import request from 'supertest';
import { closeTestApp, createTestApp, TestContext } from './helpers/app.js';
import { bearer, signUpMember, SignedInMember } from './helpers/auth.js';

// Task 15 — SPEC-library.md: a Member's private Watchlist.
describe('library: /me/watchlist (e2e)', () => {
  let ctx: TestContext;
  let alice: SignedInMember;
  let bob: SignedInMember;

  const newMovie = async (title: string, releaseYear = 2000) =>
    (await ctx.prisma.movie.create({ data: { title, releaseYear } })).id;
  const list = (who: SignedInMember, query = '') =>
    request(ctx.http).get(`/me/watchlist${query}`).set(bearer(who.token));
  const add = (who: SignedInMember, movieId: number | string) =>
    request(ctx.http).put(`/me/watchlist/${movieId}`).set(bearer(who.token));
  const remove = (who: SignedInMember, movieId: number | string) =>
    request(ctx.http).delete(`/me/watchlist/${movieId}`).set(bearer(who.token));

  beforeEach(async () => {
    // Fresh Members per test so lists never leak between tests.
    alice = await signUpMember(ctx.http, { displayName: 'Alice' });
    bob = await signUpMember(ctx.http, { displayName: 'Bob' });
  });

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  it('401 on every route without a token', async () => {
    await request(ctx.http).get('/me/watchlist').expect(401);
    await request(ctx.http).put('/me/watchlist/1').expect(401);
    await request(ctx.http).delete('/me/watchlist/1').expect(401);
  });

  it('add → list → remove', async () => {
    const movieId = await newMovie('Parasite', 2019);

    await add(alice, movieId).expect(204);
    const res = await list(alice).expect(200);
    expect(res.body).toEqual({
      data: [
        {
          addedAt: expect.any(String),
          movie: {
            id: movieId,
            title: 'Parasite',
            releaseYear: 2019,
            posterUrl: null,
            communityRating: null,
          },
        },
      ],
      meta: { page: 1, limit: 20, total: 1 },
    });

    await remove(alice, movieId).expect(204);
    expect((await list(alice).expect(200)).body.data).toEqual([]);
  });

  it('idempotent: a second PUT or DELETE is still 204, and the list has one row', async () => {
    const movieId = await newMovie('Inception');

    await add(alice, movieId).expect(204);
    await add(alice, movieId).expect(204);
    expect((await list(alice).expect(200)).body.meta.total).toBe(1);

    await remove(alice, movieId).expect(204);
    await remove(alice, movieId).expect(204);
    expect((await list(alice).expect(200)).body.meta.total).toBe(0);
  });

  it('newest added first, and paginates', async () => {
    const first = await newMovie('First');
    const second = await newMovie('Second');
    await add(alice, first).expect(204);
    await add(alice, second).expect(204);

    const res = await list(alice).expect(200);
    expect(
      res.body.data.map((r: { movie: { id: number } }) => r.movie.id),
    ).toEqual([second, first]);

    const page2 = await list(alice, '?limit=1&page=2').expect(200);
    expect(page2.body.data[0].movie.id).toBe(first);
    expect(page2.body.meta).toEqual({ page: 2, limit: 1, total: 2 });
  });

  it("one Member never sees another Member's list", async () => {
    const movieId = await newMovie('Private');
    await add(alice, movieId).expect(204);

    expect((await list(bob).expect(200)).body.meta.total).toBe(0);
    // Bob removing it does nothing to Alice's list.
    await remove(bob, movieId).expect(204);
    expect((await list(alice).expect(200)).body.meta.total).toBe(1);
  });

  it('unknown Movie → 404; bad id → 400', async () => {
    const res = await add(alice, 99999).expect(404);
    expect(res.body).toEqual({ message: 'Movie not found' });
    await remove(alice, 99999).expect(404);
    await add(alice, 'abc').expect(400);
  });

  it('deleting the Movie removes it from every Watchlist', async () => {
    const movieId = await newMovie('Gone');
    await add(alice, movieId).expect(204);

    await ctx.prisma.movie.delete({ where: { id: movieId } });

    expect((await list(alice).expect(200)).body.data).toEqual([]);
  });
});
