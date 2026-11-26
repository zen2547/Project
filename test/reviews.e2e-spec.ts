import request from 'supertest';
import { closeTestApp, createTestApp, TestContext } from './helpers/app.js';
import { bearer, signUpMember, SignedInMember } from './helpers/auth.js';

type Rating = { average: number; count: number } | null;

// Tasks 17–18 — SPEC-reviews.md: Reviews and the Community Rating.
describe('reviews (e2e)', () => {
  let ctx: TestContext;

  const newMovie = async (title = 'Reviewed Movie') =>
    (await ctx.prisma.movie.create({ data: { title, releaseYear: 2010 } })).id;
  const putReview = (who: SignedInMember, movieId: number, body: object) =>
    request(ctx.http)
      .put(`/movies/${movieId}/review`)
      .set(bearer(who.token))
      .send(body);
  const deleteReview = (who: SignedInMember, movieId: number) =>
    request(ctx.http)
      .delete(`/movies/${movieId}/review`)
      .set(bearer(who.token));
  const ratingOf = async (movieId: number): Promise<Rating> =>
    (await request(ctx.http).get(`/movies/${movieId}`).expect(200)).body
      .communityRating;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  describe('auth', () => {
    it('401: PUT, DELETE and /me/reviews without a token; reading is public', async () => {
      const movieId = await newMovie();
      await request(ctx.http)
        .put(`/movies/${movieId}/review`)
        .send({ score: 8 })
        .expect(401);
      await request(ctx.http).delete(`/movies/${movieId}/review`).expect(401);
      await request(ctx.http).get('/me/reviews').expect(401);
      await request(ctx.http).get(`/movies/${movieId}/reviews`).expect(200);
    });
  });

  describe('PUT /movies/:id/review', () => {
    let member: SignedInMember;

    beforeEach(async () => {
      member = await signUpMember(ctx.http);
    });

    it('200 returns the Review; Comment is trimmed', async () => {
      const movieId = await newMovie();
      const res = await putReview(member, movieId, {
        score: 8,
        comment: '  Loved it  ',
      }).expect(200);

      expect(res.body).toEqual({
        id: expect.any(Number),
        movieId,
        score: 8,
        comment: 'Loved it',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it('PUT twice → exactly one Review, holding the second Score', async () => {
      const movieId = await newMovie();
      const first = await putReview(member, movieId, { score: 4 }).expect(200);
      const second = await putReview(member, movieId, { score: 9 }).expect(200);

      expect(second.body.id).toBe(first.body.id);
      const rows = await ctx.prisma.review.findMany({ where: { movieId } });
      expect(rows).toHaveLength(1);
      expect(rows[0].score).toBe(9);
      expect(await ratingOf(movieId)).toEqual({ average: 9, count: 1 });
    });

    it('PUT replaces the whole Review: no comment → null; "" → null', async () => {
      const movieId = await newMovie();
      await putReview(member, movieId, { score: 7, comment: 'first' }).expect(
        200,
      );

      const noComment = await putReview(member, movieId, { score: 7 }).expect(
        200,
      );
      expect(noComment.body.comment).toBeNull();

      const blank = await putReview(member, movieId, {
        score: 7,
        comment: '   ',
      }).expect(200);
      expect(blank.body.comment).toBeNull();
    });

    it.each([
      ['score 0', { score: 0 }],
      ['score 11', { score: 11 }],
      ['score 7.5', { score: 7.5 }],
      ['score as a string', { score: '8' }],
      ['no score', { comment: 'hi' }],
      ['comment over 2000 chars', { score: 5, comment: 'x'.repeat(2001) }],
      ['unknown field', { score: 5, ratingAvg: 10 }],
    ])('400: %s', async (_label, body) => {
      const movieId = await newMovie();
      await putReview(member, movieId, body).expect(400);
      expect(await ctx.prisma.review.count({ where: { movieId } })).toBe(0);
    });

    it('404: unknown Movie', async () => {
      const res = await putReview(member, 99999, { score: 5 }).expect(404);
      expect(res.body).toEqual({ message: 'Movie not found' });
    });

    it('posting a Review puts the Movie on /me/watched', async () => {
      const movieId = await newMovie();
      await putReview(member, movieId, { score: 6 }).expect(200);

      const watched = await request(ctx.http)
        .get('/me/watched')
        .set(bearer(member.token))
        .expect(200);
      expect(
        watched.body.data.map((w: { movie: { id: number } }) => w.movie.id),
      ).toContain(movieId);
    });
  });

  describe('Community Rating through create → replace → delete', () => {
    it('is right at every step and ends at null; Watched stays', async () => {
      const movieId = await newMovie();
      const alice = await signUpMember(ctx.http);
      const bob = await signUpMember(ctx.http);
      expect(await ratingOf(movieId)).toBeNull();

      await putReview(alice, movieId, { score: 8 }).expect(200);
      expect(await ratingOf(movieId)).toEqual({ average: 8, count: 1 });

      await putReview(bob, movieId, { score: 5 }).expect(200);
      expect(await ratingOf(movieId)).toEqual({ average: 6.5, count: 2 });

      await putReview(alice, movieId, { score: 9 }).expect(200); // replace
      expect(await ratingOf(movieId)).toEqual({ average: 7, count: 2 });

      await deleteReview(alice, movieId).expect(204);
      expect(await ratingOf(movieId)).toEqual({ average: 5, count: 1 });

      await deleteReview(bob, movieId).expect(204);
      expect(await ratingOf(movieId)).toBeNull();

      // Deleting a Review does not un-mark Watched.
      const watched = await request(ctx.http)
        .get('/me/watched')
        .set(bearer(alice.token))
        .expect(200);
      expect(
        watched.body.data.map((w: { movie: { id: number } }) => w.movie.id),
      ).toContain(movieId);
    });

    it('the list endpoint shows the same rating', async () => {
      const movieId = await newMovie('Listed rating');
      const alice = await signUpMember(ctx.http);
      await putReview(alice, movieId, { score: 3 }).expect(200);

      const res = await request(ctx.http)
        .get('/movies?q=listed%20rating')
        .expect(200);
      expect(res.body.data[0].communityRating).toEqual({
        average: 3,
        count: 1,
      });
    });
  });

  describe('concurrency (row lock)', () => {
    it('two Members at once → count 2, correct average', async () => {
      const movieId = await newMovie();
      const [a, b] = await Promise.all([
        signUpMember(ctx.http),
        signUpMember(ctx.http),
      ]);

      await Promise.all([
        putReview(a, movieId, { score: 10 }).expect(200),
        putReview(b, movieId, { score: 7 }).expect(200),
      ]);

      expect(await ratingOf(movieId)).toEqual({ average: 8.5, count: 2 });
    });

    it('a burst of 6 at once still adds up', async () => {
      const movieId = await newMovie();
      const members: SignedInMember[] = [];
      for (let i = 0; i < 6; i++) members.push(await signUpMember(ctx.http));
      const scores = [10, 9, 8, 7, 6, 5]; // average 7.5

      await Promise.all(
        members.map((m, i) =>
          putReview(m, movieId, { score: scores[i] }).expect(200),
        ),
      );

      expect(await ratingOf(movieId)).toEqual({ average: 7.5, count: 6 });
    });
  });

  describe('DELETE /movies/:id/review', () => {
    it('404 when the caller has no Review there; 404 unknown Movie', async () => {
      const movieId = await newMovie();
      const alice = await signUpMember(ctx.http);
      const bob = await signUpMember(ctx.http);
      await putReview(bob, movieId, { score: 8 }).expect(200);

      // Alice can't delete Bob's Review: she simply has none.
      const res = await deleteReview(alice, movieId).expect(404);
      expect(res.body).toEqual({
        message: 'You have no Review on this Movie',
      });
      expect(await ratingOf(movieId)).toEqual({ average: 8, count: 1 });

      await deleteReview(alice, 99999).expect(404);
    });
  });

  describe('reading Reviews', () => {
    it('GET /movies/:id/reviews: newest first, author is id + displayName only', async () => {
      const movieId = await newMovie();
      const first = await signUpMember(ctx.http, { displayName: 'First' });
      const second = await signUpMember(ctx.http, { displayName: 'Second' });
      await putReview(first, movieId, { score: 6, comment: 'ok' }).expect(200);
      await putReview(second, movieId, { score: 9 }).expect(200);

      const res = await request(ctx.http)
        .get(`/movies/${movieId}/reviews`)
        .expect(200);

      expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 2 });
      expect(res.body.data[0]).toEqual({
        id: expect.any(Number),
        score: 9,
        comment: null,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        author: { id: second.id, displayName: 'Second' },
      });
      expect(res.body.data[1].author.displayName).toBe('First');
      // No email anywhere in the response.
      expect(JSON.stringify(res.body)).not.toContain('@');
    });

    it('GET /movies/:id/reviews: unknown Movie → 404', async () => {
      await request(ctx.http).get('/movies/99999/reviews').expect(404);
    });

    it('GET /me/reviews: only my Reviews, with their Movie', async () => {
      const movieA = await newMovie('Mine A');
      const movieB = await newMovie('Mine B');
      const me = await signUpMember(ctx.http);
      const other = await signUpMember(ctx.http);
      await putReview(me, movieA, { score: 5 }).expect(200);
      await putReview(me, movieB, { score: 7 }).expect(200);
      await putReview(other, movieA, { score: 1 }).expect(200);

      const res = await request(ctx.http)
        .get('/me/reviews')
        .set(bearer(me.token))
        .expect(200);

      expect(res.body.meta.total).toBe(2);
      expect(res.body.data[0]).toMatchObject({
        score: 7,
        movie: {
          id: movieB,
          title: 'Mine B',
          releaseYear: 2010,
          posterUrl: null,
        },
      });
      expect(JSON.stringify(res.body)).not.toContain('@');
    });
  });

  it('deleting a Movie deletes its Reviews', async () => {
    const movieId = await newMovie('Short-lived');
    const member = await signUpMember(ctx.http);
    await putReview(member, movieId, { score: 8 }).expect(200);

    await ctx.prisma.movie.delete({ where: { id: movieId } });

    expect(await ctx.prisma.review.count({ where: { movieId } })).toBe(0);
  });
});
