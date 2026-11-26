import request from 'supertest';
import { closeTestApp, createTestApp, TestContext } from './helpers/app.js';
import { bearer, signUpMember, SignedInMember } from './helpers/auth.js';

// Task 19 — SPEC-library.md: GET /me/movies/:movieId, the caller's own
// state for one Movie page.
describe('library: GET /me/movies/:movieId (e2e)', () => {
  let ctx: TestContext;
  let me: SignedInMember;
  let movieId: number;

  const stateOf = (who: SignedInMember, id: number | string = movieId) =>
    request(ctx.http).get(`/me/movies/${id}`).set(bearer(who.token));
  const put = (path: string) =>
    request(ctx.http).put(path).set(bearer(me.token));

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    me = await signUpMember(ctx.http);
    movieId = (
      await ctx.prisma.movie.create({
        data: { title: 'State test', releaseYear: 2016 },
      })
    ).id;
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  it('401 without a token; 404 unknown Movie; 400 bad id', async () => {
    await request(ctx.http).get(`/me/movies/${movieId}`).expect(401);
    await stateOf(me, 99999).expect(404);
    await stateOf(me, 'abc').expect(400);
  });

  it('none', async () => {
    const res = await stateOf(me).expect(200);
    expect(res.body).toEqual({
      inWatchlist: false,
      watched: false,
      myReview: null,
    });
  });

  it('Watchlist only', async () => {
    await put(`/me/watchlist/${movieId}`).expect(204);
    expect((await stateOf(me).expect(200)).body).toEqual({
      inWatchlist: true,
      watched: false,
      myReview: null,
    });
  });

  it('Watched only', async () => {
    await put(`/me/watched/${movieId}`).expect(204);
    expect((await stateOf(me).expect(200)).body).toEqual({
      inWatchlist: false,
      watched: true,
      myReview: null,
    });
  });

  it('reviewed (which also marks Watched)', async () => {
    await put(`/movies/${movieId}/review`)
      .send({ score: 9, comment: 'Wow' })
      .expect(200);
    expect((await stateOf(me).expect(200)).body).toEqual({
      inWatchlist: false,
      watched: true,
      myReview: { score: 9, comment: 'Wow' },
    });
  });

  it('everything at once', async () => {
    await put(`/me/watchlist/${movieId}`).expect(204);
    await put(`/movies/${movieId}/review`).send({ score: 4 }).expect(200);
    expect((await stateOf(me).expect(200)).body).toEqual({
      inWatchlist: true,
      watched: true,
      myReview: { score: 4, comment: null },
    });
  });

  it("another Member's state is not mine", async () => {
    await put(`/me/watchlist/${movieId}`).expect(204);
    await put(`/movies/${movieId}/review`).send({ score: 4 }).expect(200);

    const other = await signUpMember(ctx.http);
    expect((await stateOf(other).expect(200)).body).toEqual({
      inWatchlist: false,
      watched: false,
      myReview: null,
    });
  });
});
