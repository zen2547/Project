import request from 'supertest';
import { closeTestApp, createTestApp, TestContext } from './helpers/app.js';
import { bearer, signUpMember, SignedInMember } from './helpers/auth.js';

// Task 16 — SPEC-library.md: "Mark as watched".
describe('library: /me/watched (e2e)', () => {
  let ctx: TestContext;
  let alice: SignedInMember;
  let bob: SignedInMember;

  const newMovie = async (title: string) =>
    (await ctx.prisma.movie.create({ data: { title, releaseYear: 2001 } })).id;
  const call = (
    method: 'get' | 'put' | 'delete',
    path: string,
    who: SignedInMember,
  ) => request(ctx.http)[method](path).set(bearer(who.token));

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    alice = await signUpMember(ctx.http);
    bob = await signUpMember(ctx.http);
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  it('401 on every route without a token', async () => {
    await request(ctx.http).get('/me/watched').expect(401);
    await request(ctx.http).put('/me/watched/1').expect(401);
    await request(ctx.http).delete('/me/watched/1').expect(401);
  });

  it('mark → list (with watchedAt) → unmark; repeats are still 204', async () => {
    const movieId = await newMovie('Spirited Away');

    await call('put', `/me/watched/${movieId}`, alice).expect(204);
    await call('put', `/me/watched/${movieId}`, alice).expect(204);

    const res = await call('get', '/me/watched', alice).expect(200);
    expect(res.body.meta.total).toBe(1);
    expect(res.body.data[0]).toEqual({
      watchedAt: expect.any(String),
      movie: {
        id: movieId,
        title: 'Spirited Away',
        releaseYear: 2001,
        posterUrl: null,
        communityRating: null,
      },
    });

    await call('delete', `/me/watched/${movieId}`, alice).expect(204);
    await call('delete', `/me/watched/${movieId}`, alice).expect(204);
    expect(
      (await call('get', '/me/watched', alice).expect(200)).body.meta.total,
    ).toBe(0);
  });

  it('Watched and Watchlist are independent', async () => {
    const movieId = await newMovie('Both lists');
    await call('put', `/me/watchlist/${movieId}`, alice).expect(204);

    await call('put', `/me/watched/${movieId}`, alice).expect(204);
    // still on the Watchlist
    const watchlist = await call('get', '/me/watchlist', alice).expect(200);
    expect(watchlist.body.meta.total).toBe(1);

    // and un-marking Watched leaves the Watchlist alone too
    await call('delete', `/me/watched/${movieId}`, alice).expect(204);
    const again = await call('get', '/me/watchlist', alice).expect(200);
    expect(again.body.meta.total).toBe(1);
  });

  it("Members don't see each other's Watched list", async () => {
    const movieId = await newMovie('Mine');
    await call('put', `/me/watched/${movieId}`, alice).expect(204);

    const res = await call('get', '/me/watched', bob).expect(200);
    expect(res.body.meta.total).toBe(0);
  });

  it('unknown Movie → 404', async () => {
    await call('put', '/me/watched/99999', alice).expect(404);
    await call('delete', '/me/watched/99999', alice).expect(404);
  });
});
