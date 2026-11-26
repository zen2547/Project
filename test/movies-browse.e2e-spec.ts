import request from 'supertest';
import { closeTestApp, createTestApp, TestContext } from './helpers/app.js';
import { bearer, signInAdmin } from './helpers/auth.js';

type Row = {
  id: number;
  title: string;
  releaseYear: number;
  communityRating: { average: number; count: number } | null;
};

// Task 10 — SPEC-catalogue.md: a Guest lists, searches, filters, sorts and
// pages through Movies.
describe('catalogue: GET /movies (e2e)', () => {
  let ctx: TestContext;
  const ids: Record<string, number> = {};
  let scifi: number;
  let dream: number;

  const browse = (query: string) =>
    request(ctx.http).get(`/movies${query}`).expect(200);
  const titles = (rows: Row[]) => rows.map((r) => r.title);

  beforeAll(async () => {
    ctx = await createTestApp();
    const admin = await signInAdmin(ctx.http, ctx.prisma);
    const post = async (path: string, body: object) =>
      (
        await request(ctx.http)
          .post(path)
          .set(bearer(admin.token))
          .send(body)
          .expect(201)
      ).body.id as number;

    scifi = await post('/genres', { name: 'Sci-Fi' });
    const drama = await post('/genres', { name: 'Drama' });
    dream = await post('/keywords', { name: 'dream' });

    // Created in this order, so "newest" is the reverse of it.
    const movies = [
      {
        title: 'The Matrix',
        releaseYear: 1999,
        genreIds: [scifi],
        rating: 8.7,
      },
      {
        title: 'The Matrix Reloaded',
        releaseYear: 2003,
        genreIds: [scifi],
        rating: 7.2,
      },
      { title: 'Parasite', releaseYear: 2019, genreIds: [drama], rating: null },
      { title: 'Spirited Away', releaseYear: 2001, genreIds: [], rating: 8.6 },
      {
        title: 'Inception',
        releaseYear: 2010,
        genreIds: [scifi],
        keywordIds: [dream],
        rating: null,
      },
    ];
    for (const { rating, ...movie } of movies) {
      ids[movie.title] = await post('/movies', movie);
      if (rating !== null) {
        // Reviews (Task 17) own these columns; set them directly for sorting.
        await ctx.prisma.movie.update({
          where: { id: ids[movie.title] },
          data: { ratingAvg: rating, reviewCount: 3 },
        });
      }
    }
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  it('Guests get page 1 of everything, newest first, with meta', async () => {
    const res = await browse('');

    expect(titles(res.body.data)).toEqual([
      'Inception',
      'Spirited Away',
      'Parasite',
      'The Matrix Reloaded',
      'The Matrix',
    ]);
    expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 5 });
  });

  it('each row has exactly the list fields', async () => {
    const res = await browse('?q=spirited');
    expect(res.body.data).toEqual([
      {
        id: ids['Spirited Away'],
        title: 'Spirited Away',
        releaseYear: 2001,
        certification: 'NOT_RATED',
        runtimeMinutes: null,
        posterUrl: null,
        communityRating: { average: 8.6, count: 3 },
      },
    ]);
  });

  describe('filters narrow the results and meta.total matches', () => {
    it.each([
      ['?q=matrix', ['The Matrix Reloaded', 'The Matrix']],
      ['?q=MATRIX', ['The Matrix Reloaded', 'The Matrix']],
      ['?q=%20%20', null], // blank search = no search
      ['?year=2001', ['Spirited Away']],
      ['?q=nothing-like-this', []],
    ])('%s', async (query, expected) => {
      const res = await browse(query);
      const want = expected ?? titles((await browse('')).body.data);
      expect(titles(res.body.data)).toEqual(want);
      expect(res.body.meta.total).toBe(want.length);
    });

    it('?genreId', async () => {
      const res = await browse(`?genreId=${scifi}`);
      expect(titles(res.body.data)).toEqual([
        'Inception',
        'The Matrix Reloaded',
        'The Matrix',
      ]);
      expect(res.body.meta.total).toBe(3);
    });

    it('?keywordId', async () => {
      const res = await browse(`?keywordId=${dream}`);
      expect(titles(res.body.data)).toEqual(['Inception']);
      expect(res.body.meta.total).toBe(1);
    });

    it('filters combine (AND)', async () => {
      const res = await browse(`?genreId=${scifi}&q=reloaded`);
      expect(titles(res.body.data)).toEqual(['The Matrix Reloaded']);
      expect(res.body.meta.total).toBe(1);
    });
  });

  describe('sort', () => {
    it('year asc / desc', async () => {
      const asc = await browse('?sort=year&order=asc');
      expect(asc.body.data.map((r: Row) => r.releaseYear)).toEqual([
        1999, 2001, 2003, 2010, 2019,
      ]);
      const desc = await browse('?sort=year');
      expect(desc.body.data.map((r: Row) => r.releaseYear)).toEqual([
        2019, 2010, 2003, 2001, 1999,
      ]);
    });

    it('rating desc: best first, unrated last', async () => {
      const res = await browse('?sort=rating&order=desc');
      expect(titles(res.body.data)).toEqual([
        'The Matrix',
        'Spirited Away',
        'The Matrix Reloaded',
        // unrated, tie broken by id
        'Parasite',
        'Inception',
      ]);
    });

    it('rating asc: worst first, unrated STILL last', async () => {
      const res = await browse('?sort=rating&order=asc');
      expect(titles(res.body.data)).toEqual([
        'The Matrix Reloaded',
        'Spirited Away',
        'The Matrix',
        'Parasite',
        'Inception',
      ]);
    });

    it('newest asc = oldest added first', async () => {
      const res = await browse('?order=asc');
      expect(titles(res.body.data)[0]).toBe('The Matrix');
    });
  });

  describe('pagination', () => {
    it('pages are slices of the same order; total stays the same', async () => {
      const all = titles((await browse('?sort=year&order=asc')).body.data);

      const p1 = await browse('?sort=year&order=asc&limit=2&page=1');
      const p2 = await browse('?sort=year&order=asc&limit=2&page=2');
      const p3 = await browse('?sort=year&order=asc&limit=2&page=3');

      expect(titles(p1.body.data)).toEqual(all.slice(0, 2));
      expect(titles(p2.body.data)).toEqual(all.slice(2, 4));
      expect(titles(p3.body.data)).toEqual(all.slice(4));
      expect(p2.body.meta).toEqual({ page: 2, limit: 2, total: 5 });
    });

    it('a page past the end is empty, not an error', async () => {
      const res = await browse('?page=99');
      expect(res.body).toEqual({
        data: [],
        meta: { page: 99, limit: 20, total: 5 },
      });
    });
  });

  it.each([
    '?limit=51',
    '?limit=0',
    '?page=0',
    '?page=abc',
    '?sort=popular',
    '?order=up',
    '?genreId=abc',
    '?keywordId=-1',
    '?year=1800',
  ])('400: %s', async (query) => {
    await request(ctx.http).get(`/movies${query}`).expect(400);
  });
});
