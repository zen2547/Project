import request from 'supertest';
import { closeTestApp, createTestApp, TestContext } from './helpers/app.js';
import { seedCatalogue } from '../prisma/seed/catalogue.js';
import { SEED_MOVIES } from '../prisma/seed-data/movies.js';

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
      expect(page.communityRating, why).toBeNull(); // Reviews come in Task 20
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
