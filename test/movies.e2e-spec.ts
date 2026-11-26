import request from 'supertest';
import { closeTestApp, createTestApp, TestContext } from './helpers/app.js';
import {
  bearer,
  signInAdmin,
  signUpMember,
  SignedInMember,
} from './helpers/auth.js';

type Named = { id: number; name: string };

// Task 9 — SPEC-catalogue.md: Admin writes a Movie; anyone reads its page.
describe('catalogue: /movies (e2e)', () => {
  let ctx: TestContext;
  let admin: SignedInMember;
  let member: SignedInMember;
  let drama: Named;
  let scifi: Named;
  let dream: Named;
  let heist: Named;

  beforeAll(async () => {
    ctx = await createTestApp();
    admin = await signInAdmin(ctx.http, ctx.prisma);
    member = await signUpMember(ctx.http);

    const make = async (path: string, name: string) =>
      (
        await request(ctx.http)
          .post(path)
          .set(bearer(admin.token))
          .send({ name })
          .expect(201)
      ).body as Named;
    scifi = await make('/genres', 'Sci-Fi');
    drama = await make('/genres', 'Drama');
    heist = await make('/keywords', 'heist');
    dream = await make('/keywords', 'dream');
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  const asAdmin = () => bearer(admin.token);
  const create = (body: object) =>
    request(ctx.http).post('/movies').set(asAdmin()).send(body);
  const update = (id: number | string, body: object) =>
    request(ctx.http).patch(`/movies/${id}`).set(asAdmin()).send(body);
  const getPage = (id: number | string) =>
    request(ctx.http).get(`/movies/${id}`);

  const inception = () => ({
    title: 'Inception',
    releaseYear: 2010,
    certification: 'PG_13',
    runtimeMinutes: 148,
    synopsis: 'A thief who enters dreams takes on one last job.',
    posterUrl: 'https://cdn.example.com/inception.jpg',
    genreIds: [scifi.id, drama.id],
    keywordIds: [heist.id, dream.id],
  });

  describe('auth on writes', () => {
    it('401 without a token', async () => {
      await request(ctx.http).post('/movies').send(inception()).expect(401);
      await request(ctx.http)
        .patch('/movies/1')
        .send({ title: 'x' })
        .expect(401);
      await request(ctx.http).delete('/movies/1').expect(401);
    });

    it('403 for a Member', async () => {
      const asMember = bearer(member.token);
      await request(ctx.http)
        .post('/movies')
        .set(asMember)
        .send(inception())
        .expect(403);
      await request(ctx.http)
        .patch('/movies/1')
        .set(asMember)
        .send({ title: 'x' })
        .expect(403);
      await request(ctx.http).delete('/movies/1').set(asMember).expect(403);
    });
  });

  describe('create + view', () => {
    it('201 returns the page shape; Guests can read it', async () => {
      const created = await create(inception()).expect(201);

      expect(created.body).toEqual({
        id: expect.any(Number),
        title: 'Inception',
        releaseYear: 2010,
        certification: 'PG_13',
        runtimeMinutes: 148,
        synopsis: 'A thief who enters dreams takes on one last job.',
        posterUrl: 'https://cdn.example.com/inception.jpg',
        // chips come back sorted by name
        genres: [drama, scifi],
        keywords: [dream, heist],
        // cast & crew and media are added through their own endpoints
        directors: [],
        writers: [],
        stars: [],
        trailers: [],
        photos: [],
        communityRating: null,
        streamingLinks: [],
      });

      const page = await getPage(created.body.id).expect(200);
      expect(page.body).toEqual(created.body);
    });

    it('only title + releaseYear are required; certification defaults to NOT_RATED', async () => {
      const res = await create({ title: 'Untitled', releaseYear: 2024 }).expect(
        201,
      );
      expect(res.body).toMatchObject({
        certification: 'NOT_RATED',
        runtimeMinutes: null,
        synopsis: null,
        posterUrl: null,
        genres: [],
        keywords: [],
      });
    });

    it('duplicate ids in a list count once', async () => {
      const res = await create({
        title: 'Dupes',
        releaseYear: 2020,
        genreIds: [drama.id, drama.id],
      }).expect(201);
      expect(res.body.genres).toEqual([drama]);
    });

    it('GET: unknown id → 404; bad id → 400', async () => {
      const res = await getPage(99999).expect(404);
      expect(res.body).toEqual({ message: 'Movie not found' });
      await getPage('abc').expect(400);
    });

    it('communityRating shows once the Movie has a rating', async () => {
      const { body } = await create({ title: 'Rated', releaseYear: 2001 });
      // Reviews (Task 17) own these columns; set them directly to prove the shape.
      await ctx.prisma.movie.update({
        where: { id: body.id },
        data: { ratingAvg: 8.7, reviewCount: 5 },
      });

      const page = await getPage(body.id).expect(200);
      expect(page.body.communityRating).toEqual({ average: 8.7, count: 5 });
    });
  });

  describe('validation → 400', () => {
    const maxYear = new Date().getFullYear() + 5;

    it.each([
      ['releaseYear before 1888', { releaseYear: 1887 }],
      ['releaseYear more than 5 years ahead', { releaseYear: maxYear + 1 }],
      ['releaseYear as a string', { releaseYear: '2010' }],
      ['runtimeMinutes 0', { runtimeMinutes: 0 }],
      ['runtimeMinutes 601', { runtimeMinutes: 601 }],
      ['posterUrl on http', { posterUrl: 'http://cdn.example.com/a.jpg' }],
      ['unknown certification', { certification: 'PG13' }],
      ['blank title', { title: '   ' }],
      ['ratingAvg in the body', { ratingAvg: 10 }],
      ['reviewCount in the body', { reviewCount: 999 }],
      ['genreIds as strings', { genreIds: ['1'] }],
    ])('%s', async (_label, override) => {
      await create({ ...inception(), ...override }).expect(400);
    });

    it('the newest allowed year is accepted', async () => {
      await create({ title: 'Future', releaseYear: maxYear }).expect(201);
    });

    it('missing title or releaseYear', async () => {
      await create({ releaseYear: 2010 }).expect(400);
      await create({ title: 'No year' }).expect(400);
    });

    it('unknown genreIds and keywordIds → 400 naming them', async () => {
      const res = await create({
        ...inception(),
        genreIds: [drama.id, 9999, 9998],
        keywordIds: [8888],
      }).expect(400);

      expect(res.body).toEqual({
        message: ['Unknown genreIds: 9999, 9998', 'Unknown keywordIds: 8888'],
      });
    });
  });

  describe('update', () => {
    let id: number;

    beforeEach(async () => {
      id = (await create(inception()).expect(201)).body.id;
    });

    it('partial: only the sent fields change', async () => {
      const res = await update(id, { runtimeMinutes: 150 }).expect(200);
      expect(res.body).toMatchObject({
        title: 'Inception',
        runtimeMinutes: 150,
        genres: [drama, scifi],
      });
    });

    it('genreIds replaces the whole set; keywords untouched', async () => {
      const res = await update(id, { genreIds: [drama.id] }).expect(200);
      expect(res.body.genres).toEqual([drama]);
      expect(res.body.keywords).toEqual([dream, heist]);
    });

    it('an empty list clears it', async () => {
      const res = await update(id, { keywordIds: [] }).expect(200);
      expect(res.body.keywords).toEqual([]);
    });

    it('null clears an optional field', async () => {
      const res = await update(id, { synopsis: null, posterUrl: null }).expect(
        200,
      );
      expect(res.body).toMatchObject({ synopsis: null, posterUrl: null });
    });

    it('400: empty body, ratingAvg, null title, unknown genreIds', async () => {
      await update(id, {}).expect(400);
      await update(id, { ratingAvg: 5 }).expect(400);
      await update(id, { title: null }).expect(400);
      const res = await update(id, { genreIds: [7777] }).expect(400);
      expect(res.body).toEqual({ message: ['Unknown genreIds: 7777'] });
    });

    it('404: unknown id', async () => {
      await update(99999, { title: 'Nope' }).expect(404);
    });
  });

  describe('delete', () => {
    it('204, page is gone, Genres and Keywords stay; again → 404', async () => {
      const { body } = await create(inception()).expect(201);
      const del = () =>
        request(ctx.http).delete(`/movies/${body.id}`).set(asAdmin());

      await del().expect(204);
      await getPage(body.id).expect(404);

      const genres = await request(ctx.http).get('/genres').expect(200);
      expect(genres.body).toEqual(expect.arrayContaining([drama, scifi]));
      const keywords = await request(ctx.http).get('/keywords').expect(200);
      expect(keywords.body).toEqual(expect.arrayContaining([dream, heist]));

      await del().expect(404);
    });

    it('deleting a Genre only removes it from the Movie', async () => {
      const temp = (
        await request(ctx.http)
          .post('/genres')
          .set(asAdmin())
          .send({ name: 'Temp genre' })
          .expect(201)
      ).body as Named;
      const { body } = await create({
        title: 'Tagged',
        releaseYear: 2015,
        genreIds: [temp.id, drama.id],
      }).expect(201);

      await request(ctx.http)
        .delete(`/genres/${temp.id}`)
        .set(asAdmin())
        .expect(204);

      const page = await getPage(body.id).expect(200);
      expect(page.body.genres).toEqual([drama]);
    });
  });
});
