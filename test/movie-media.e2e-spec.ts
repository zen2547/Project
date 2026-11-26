import request from 'supertest';
import { closeTestApp, createTestApp, TestContext } from './helpers/app.js';
import {
  bearer,
  signInAdmin,
  signUpMember,
  SignedInMember,
} from './helpers/auth.js';

// Task 13 — SPEC-catalogue.md: Trailers, Photos and Streaming Links.
describe('catalogue: Movie media (e2e)', () => {
  let ctx: TestContext;
  let admin: SignedInMember;
  let member: SignedInMember;
  let netflix: number;
  let disney: number;

  const asAdmin = () => bearer(admin.token);
  const newMovie = async (title = 'Spirited Away') =>
    (
      await request(ctx.http)
        .post('/movies')
        .set(asAdmin())
        .send({ title, releaseYear: 2001 })
        .expect(201)
    ).body.id as number;
  const post = (path: string, body: object) =>
    request(ctx.http).post(path).set(asAdmin()).send(body);
  const put = (path: string, body: object) =>
    request(ctx.http).put(path).set(asAdmin()).send(body);
  const del = (path: string) => request(ctx.http).delete(path).set(asAdmin());
  const page = async (movieId: number) =>
    (await request(ctx.http).get(`/movies/${movieId}`).expect(200)).body;

  beforeAll(async () => {
    ctx = await createTestApp();
    admin = await signInAdmin(ctx.http, ctx.prisma);
    member = await signUpMember(ctx.http);
    netflix = (
      await post('/streaming-services', { name: 'Netflix' }).expect(201)
    ).body.id;
    disney = (
      await post('/streaming-services', { name: 'Disney+' }).expect(201)
    ).body.id;
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  it('every write: 401 without a token, 403 for a Member', async () => {
    const movieId = await newMovie();
    const writes = [
      { method: 'post', path: `/movies/${movieId}/trailers` },
      { method: 'delete', path: `/movies/${movieId}/trailers/1` },
      { method: 'post', path: `/movies/${movieId}/photos` },
      { method: 'delete', path: `/movies/${movieId}/photos/1` },
      { method: 'put', path: `/movies/${movieId}/streaming-links/${netflix}` },
      {
        method: 'delete',
        path: `/movies/${movieId}/streaming-links/${netflix}`,
      },
    ] as const;

    for (const { method, path } of writes) {
      await request(ctx.http)[method](path).send({}).expect(401);
      await request(ctx.http)
        [method](path)
        .set(bearer(member.token))
        .send({})
        .expect(403);
    }
  });

  describe('trailers', () => {
    it('201 and shown on the page', async () => {
      const movieId = await newMovie();
      const res = await post(`/movies/${movieId}/trailers`, {
        title: 'Official Trailer',
        youtubeUrl: 'https://www.youtube.com/watch?v=abc123',
      }).expect(201);

      expect(res.body).toEqual({
        id: expect.any(Number),
        title: 'Official Trailer',
        youtubeUrl: 'https://www.youtube.com/watch?v=abc123',
      });
      expect((await page(movieId)).trailers).toEqual([res.body]);
    });

    it('youtu.be short links are fine', async () => {
      const movieId = await newMovie();
      await post(`/movies/${movieId}/trailers`, {
        title: 'Teaser',
        youtubeUrl: 'https://youtu.be/abc123',
      }).expect(201);
    });

    it.each([
      'https://vimeo.com/123',
      'http://www.youtube.com/watch?v=abc',
      'https://youtube.com.evil.example/watch?v=abc',
      'https://notyoutube.com/watch?v=abc',
      'javascript:alert(1)',
    ])('400: youtubeUrl %s', async (youtubeUrl) => {
      const movieId = await newMovie();
      await post(`/movies/${movieId}/trailers`, {
        title: 'Bad',
        youtubeUrl,
      }).expect(400);
    });

    it('404 unknown Movie; DELETE 204 then 404', async () => {
      await post('/movies/99999/trailers', {
        title: 'x',
        youtubeUrl: 'https://youtu.be/x',
      }).expect(404);

      const movieId = await newMovie();
      const { body } = await post(`/movies/${movieId}/trailers`, {
        title: 'x',
        youtubeUrl: 'https://youtu.be/x',
      }).expect(201);
      await del(`/movies/${movieId}/trailers/${body.id}`).expect(204);
      await del(`/movies/${movieId}/trailers/${body.id}`).expect(404);
    });
  });

  describe('photos', () => {
    it('201 with or without a caption; http → 400', async () => {
      const movieId = await newMovie();
      const a = await post(`/movies/${movieId}/photos`, {
        url: 'https://cdn.example.com/1.jpg',
        caption: 'The bathhouse',
      }).expect(201);
      const b = await post(`/movies/${movieId}/photos`, {
        url: 'https://cdn.example.com/2.jpg',
      }).expect(201);

      expect(b.body).toEqual({
        id: expect.any(Number),
        url: 'https://cdn.example.com/2.jpg',
        caption: null,
      });
      expect((await page(movieId)).photos).toEqual([a.body, b.body]);

      await post(`/movies/${movieId}/photos`, {
        url: 'http://cdn.example.com/3.jpg',
      }).expect(400);
    });

    it('DELETE is scoped to the Movie in the URL', async () => {
      const movieA = await newMovie('A');
      const movieB = await newMovie('B');
      const { body: photo } = await post(`/movies/${movieA}/photos`, {
        url: 'https://cdn.example.com/a.jpg',
      }).expect(201);

      await del(`/movies/${movieB}/photos/${photo.id}`).expect(404);
      expect((await page(movieA)).photos).toHaveLength(1);

      await del(`/movies/${movieA}/photos/${photo.id}`).expect(204);
      expect((await page(movieA)).photos).toEqual([]);
    });
  });

  describe('streaming links', () => {
    it('PUT creates; PUT again keeps ONE row with the new URL', async () => {
      const movieId = await newMovie();
      const path = `/movies/${movieId}/streaming-links/${netflix}`;

      const first = await put(path, {
        url: 'https://www.netflix.com/title/1',
      }).expect(200);
      expect(first.body).toEqual({
        service: { id: netflix, name: 'Netflix', logoUrl: null },
        url: 'https://www.netflix.com/title/1',
      });

      await put(path, { url: 'https://www.netflix.com/title/2' }).expect(200);

      const rows = await ctx.prisma.streamingLink.findMany({
        where: { movieId },
      });
      expect(rows).toHaveLength(1);
      expect(rows[0].url).toBe('https://www.netflix.com/title/2');
    });

    it('the page lists links sorted by service name', async () => {
      const movieId = await newMovie();
      await put(`/movies/${movieId}/streaming-links/${netflix}`, {
        url: 'https://www.netflix.com/x',
      }).expect(200);
      await put(`/movies/${movieId}/streaming-links/${disney}`, {
        url: 'https://www.disneyplus.com/x',
      }).expect(200);

      const names = (await page(movieId)).streamingLinks.map(
        (l: { service: { name: string } }) => l.service.name,
      );
      expect(names).toEqual(['Disney+', 'Netflix']);
    });

    it('404 unknown Movie or Service; 400 http url', async () => {
      const movieId = await newMovie();
      await put(`/movies/99999/streaming-links/${netflix}`, {
        url: 'https://x.com',
      }).expect(404);
      const res = await put(`/movies/${movieId}/streaming-links/99999`, {
        url: 'https://x.com',
      }).expect(404);
      expect(res.body).toEqual({ message: 'Streaming Service not found' });
      await put(`/movies/${movieId}/streaming-links/${netflix}`, {
        url: 'http://x.com',
      }).expect(400);
    });

    it('DELETE 204 then 404', async () => {
      const movieId = await newMovie();
      const path = `/movies/${movieId}/streaming-links/${netflix}`;
      await put(path, { url: 'https://www.netflix.com/x' }).expect(200);

      await del(path).expect(204);
      await del(path).expect(404);
    });
  });

  it('deleting a Movie removes its Credits, Trailers, Photos and Links, not People or Services', async () => {
    const movieId = await newMovie('Doomed');
    const { body: actor } = await post('/people', { name: 'Survivor' }).expect(
      201,
    );
    await post(`/movies/${movieId}/credits`, {
      personId: actor.id,
      role: 'CAST',
    }).expect(201);
    await post(`/movies/${movieId}/trailers`, {
      title: 't',
      youtubeUrl: 'https://youtu.be/x',
    }).expect(201);
    await post(`/movies/${movieId}/photos`, {
      url: 'https://cdn.example.com/x.jpg',
    }).expect(201);
    await put(`/movies/${movieId}/streaming-links/${netflix}`, {
      url: 'https://www.netflix.com/x',
    }).expect(200);

    await del(`/movies/${movieId}`).expect(204);

    const where = { where: { movieId } };
    expect(await ctx.prisma.credit.count(where)).toBe(0);
    expect(await ctx.prisma.trailer.count(where)).toBe(0);
    expect(await ctx.prisma.photo.count(where)).toBe(0);
    expect(await ctx.prisma.streamingLink.count(where)).toBe(0);

    const person = await request(ctx.http)
      .get(`/people/${actor.id}`)
      .expect(200);
    expect(person.body.filmography).toEqual([]);
    const services = await request(ctx.http)
      .get('/streaming-services')
      .expect(200);
    expect(services.body.map((s: { id: number }) => s.id)).toContain(netflix);
  });
});
