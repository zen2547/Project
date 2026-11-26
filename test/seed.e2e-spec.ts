import request from 'supertest';
import { closeTestApp, createTestApp, TestContext } from './helpers/app.js';
import { seedCatalogue } from '../prisma/seed/catalogue.js';
import { SEED_MOVIES } from '../prisma/seed-data/movies.js';
import { seedMembersAndReviews } from '../prisma/seed/reviews.js';
import {
  SEED_MEMBERS,
  SEED_MEMBER_PASSWORD,
  SEED_REVIEWS,
} from '../prisma/seed-data/reviews.js';
import { ratingFromScores } from '../src/reviews/community-rating.js';
import { bearer } from './helpers/auth.js';

type ListRow = { id: number; title: string };

// Task 14 — SPEC-catalogue.md: after seeding, 12 Movies with full pages.
describe('seed: catalogue (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
    // Twice in a row: the second run must replace, not duplicate.
    await seedCatalogue(ctx.prisma);
    await seedCatalogue(ctx.prisma);
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  it('GET /movies → meta.total = 12, no duplicates after re-running', async () => {
    const res = await request(ctx.http).get('/movies?limit=50').expect(200);

    expect(res.body.meta.total).toBe(12);
    const titles = res.body.data.map((m: ListRow) => m.title).sort();
    expect(titles).toEqual(SEED_MOVIES.map((m) => m.title).sort());
  });

  it('ids restart at 1 on every run', async () => {
    const res = await request(ctx.http)
      .get('/movies?sort=year&order=asc&limit=50')
      .expect(200);
    const ids = res.body.data
      .map((m: ListRow) => m.id)
      .sort((a: number, b: number) => a - b);
    expect(ids).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
  });

  it('every Movie page has a Director, Cast, a YouTube trailer and a Streaming Link', async () => {
    const list = await request(ctx.http).get('/movies?limit=50').expect(200);

    for (const { id, title } of list.body.data as ListRow[]) {
      const page = (await request(ctx.http).get(`/movies/${id}`).expect(200))
        .body;
      const why = `${title} (id ${id})`;

      expect(page.directors.length, why).toBeGreaterThanOrEqual(1);
      expect(page.writers.length, why).toBeGreaterThanOrEqual(1);
      expect(page.stars.length, why).toBeGreaterThanOrEqual(1);
      expect(page.stars.length, why).toBeLessThanOrEqual(3);
      expect(page.genres.length, why).toBeGreaterThanOrEqual(1);
      expect(page.keywords.length, why).toBeGreaterThanOrEqual(2);
      expect(page.trailers[0].youtubeUrl, why).toMatch(
        /^https:\/\/www\.youtube\.com\//,
      );
      expect(page.streamingLinks.length, why).toBeGreaterThanOrEqual(1);
      expect(page.posterUrl, why).toBeNull(); // no hot-linked images
      expect(page.photos, why).toEqual([]);
      expect(page.communityRating, why).toBeNull(); // this suite seeds no Reviews
    }
  });

  it('spot check: Inception', async () => {
    const found = await request(ctx.http)
      .get('/movies?q=inception')
      .expect(200);
    const page = (
      await request(ctx.http)
        .get(`/movies/${found.body.data[0].id}`)
        .expect(200)
    ).body;

    expect(page).toMatchObject({
      title: 'Inception',
      releaseYear: 2010,
      certification: 'PG_13',
      runtimeMinutes: 148,
    });
    expect(page.directors.map((d: { name: string }) => d.name)).toEqual([
      'Christopher Nolan',
    ]);
    expect(page.stars[0]).toMatchObject({
      name: 'Leonardo DiCaprio',
      character: 'Cobb',
    });
  });

  it('People are shared across Movies (one Christopher Nolan, many Credits)', async () => {
    const res = await request(ctx.http)
      .get('/people?q=christopher%20nolan')
      .expect(200);
    expect(res.body.meta.total).toBe(1);

    const nolan = (
      await request(ctx.http).get(`/people/${res.body.data[0].id}`).expect(200)
    ).body;
    const titles = new Set(
      nolan.filmography.map((f: { movie: { title: string } }) => f.movie.title),
    );
    expect(titles).toEqual(
      new Set(['Interstellar', 'Inception', 'The Dark Knight']),
    );
  });

  it('the seed data obeys the API rules (credits, runtime)', () => {
    // Guards the data file: a typo there should fail here, not in the browser.
    for (const movie of SEED_MOVIES) {
      expect(movie.cast.length, movie.title).toBeGreaterThanOrEqual(1);
      expect(movie.directors.length, movie.title).toBeGreaterThanOrEqual(1);
      expect(movie.runtimeMinutes).toBeGreaterThanOrEqual(1);
      expect(movie.runtimeMinutes).toBeLessThanOrEqual(600);
    }
  });
});

type RatedRow = ListRow & {
  communityRating: { average: number; count: number } | null;
};

// Task 20 — SPEC-reviews.md → Seed: 3 Members, ~20 Reviews, and the
// rating sort proven on real reviewed data.
describe('seed: Members and Reviews (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
    await seedCatalogue(ctx.prisma);
    // Twice: Members are upserted and their Reviews replaced, not doubled.
    await seedMembersAndReviews(ctx.prisma);
    await seedMembersAndReviews(ctx.prisma);
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  const login = async (email: string) =>
    (
      await request(ctx.http)
        .post('/auth/login')
        .send({ email, password: SEED_MEMBER_PASSWORD })
        .expect(200)
    ).body.accessToken as string;

  it('3 Members can sign in; there are exactly 20 Reviews', async () => {
    for (const { email } of SEED_MEMBERS) await login(email);
    expect(await ctx.prisma.review.count()).toBe(SEED_REVIEWS.length);
  });

  it('sort=rating desc: rated Movies by average, then the 2 unrated ones', async () => {
    const res = await request(ctx.http)
      .get('/movies?sort=rating&order=desc&limit=50')
      .expect(200);
    const rows = res.body.data as RatedRow[];

    const rated = rows.filter((r) => r.communityRating !== null);
    const averages = rated.map((r) => r.communityRating?.average ?? 0);
    expect(averages).toEqual([...averages].sort((a, b) => b - a));

    // unrated come last, after every rated one
    expect(
      rows
        .slice(rated.length)
        .map((r) => r.title)
        .sort(),
    ).toEqual(['Fight Club', 'Your Name']);
  });

  it('every stored rating equals what the service maths gives', async () => {
    const res = await request(ctx.http).get('/movies?limit=50').expect(200);

    for (const row of res.body.data as RatedRow[]) {
      const scores = SEED_REVIEWS.filter((r) => r.movie === row.title).map(
        (r) => r.score,
      );
      const expected = ratingFromScores(scores);
      expect(row.communityRating, row.title).toEqual(
        expected.ratingAvg === null
          ? null
          : { average: expected.ratingAvg, count: expected.reviewCount },
      );
    }
  });

  it('re-PUTting a seeded Review with the same Score through the API changes nothing', async () => {
    const review = SEED_REVIEWS.find(
      (r) => r.movie === 'Inception' && r.by === 'Mai',
    );
    const member = SEED_MEMBERS.find((m) => m.displayName === 'Mai');
    if (!review || !member) throw new Error('seed data changed');
    const found = await request(ctx.http)
      .get('/movies?q=inception')
      .expect(200);
    const movieId = found.body.data[0].id as number;
    const before = found.body.data[0].communityRating;

    await request(ctx.http)
      .put(`/movies/${movieId}/review`)
      .set(bearer(await login(member.email)))
      .send({ score: review.score, comment: review.comment })
      .expect(200);

    const after = await request(ctx.http).get(`/movies/${movieId}`).expect(200);
    expect(after.body.communityRating).toEqual(before);
  });

  it('empty seed Comments are stored as null, and reviewers have the Movie on Watched', async () => {
    expect(await ctx.prisma.review.count({ where: { comment: '' } })).toBe(0);

    const token = await login('nina@imdb.local');
    const watched = await request(ctx.http)
      .get('/me/watched?limit=50')
      .set(bearer(token))
      .expect(200);
    const ninasMovies = SEED_REVIEWS.filter((r) => r.by === 'Nina').length;
    expect(watched.body.meta.total).toBe(ninasMovies);
  });
});
