import request from 'supertest';
import { closeTestApp, createTestApp, TestContext } from './helpers/app.js';
import {
  bearer,
  signInAdmin,
  signUpMember,
  SignedInMember,
} from './helpers/auth.js';

// Task 11 — SPEC-catalogue.md: People and their filmography.
describe('catalogue: /people (e2e)', () => {
  let ctx: TestContext;
  let admin: SignedInMember;
  let member: SignedInMember;

  beforeAll(async () => {
    ctx = await createTestApp();
    admin = await signInAdmin(ctx.http, ctx.prisma);
    member = await signUpMember(ctx.http);
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  const asAdmin = () => bearer(admin.token);
  const create = (body: object) =>
    request(ctx.http).post('/people').set(asAdmin()).send(body);
  const update = (id: number | string, body: object) =>
    request(ctx.http).patch(`/people/${id}`).set(asAdmin()).send(body);

  describe('auth on writes', () => {
    it('401 without a token, 403 for a Member', async () => {
      await request(ctx.http).post('/people').send({ name: 'x' }).expect(401);
      await request(ctx.http)
        .patch('/people/1')
        .send({ name: 'x' })
        .expect(401);
      await request(ctx.http).delete('/people/1').expect(401);

      const asMember = bearer(member.token);
      await request(ctx.http)
        .post('/people')
        .set(asMember)
        .send({ name: 'x' })
        .expect(403);
      await request(ctx.http)
        .patch('/people/1')
        .set(asMember)
        .send({ name: 'x' })
        .expect(403);
      await request(ctx.http).delete('/people/1').set(asMember).expect(403);
    });
  });

  describe('create + view', () => {
    it('201 with every field; birthDate comes back as YYYY-MM-DD', async () => {
      const res = await create({
        name: '  Christopher Nolan ',
        bio: 'British-American film-maker.',
        photoUrl: 'https://cdn.example.com/nolan.jpg',
        birthDate: '1970-07-30',
      }).expect(201);

      expect(res.body).toEqual({
        id: expect.any(Number),
        name: 'Christopher Nolan',
        bio: 'British-American film-maker.',
        photoUrl: 'https://cdn.example.com/nolan.jpg',
        birthDate: '1970-07-30',
      });
    });

    it('GET /people/:id: a Person with no Credits has an empty filmography', async () => {
      const { body } = await create({ name: 'Nobody Yet' }).expect(201);

      const page = await request(ctx.http)
        .get(`/people/${body.id}`)
        .expect(200);
      expect(page.body).toEqual({
        id: body.id,
        name: 'Nobody Yet',
        bio: null,
        photoUrl: null,
        birthDate: null,
        filmography: [],
      });
    });

    it('GET /people/:id: 404 unknown, 400 bad id', async () => {
      const res = await request(ctx.http).get('/people/99999').expect(404);
      expect(res.body).toEqual({ message: 'Person not found' });
      await request(ctx.http).get('/people/abc').expect(400);
    });

    it.each([
      ['missing name', {}],
      ['blank name', { name: '  ' }],
      ['http photo', { name: 'x', photoUrl: 'http://cdn.example.com/a.jpg' }],
      ['bad date', { name: 'x', birthDate: '1970-13-45' }],
      ['date with time', { name: 'x', birthDate: '1970-07-30T00:00:00Z' }],
      ['future birthDate', { name: 'x', birthDate: '2999-01-01' }],
      ['unknown field', { name: 'x', credits: [] }],
    ])('400: %s', async (_label, body) => {
      await create(body).expect(400);
    });
  });

  describe('GET /people (public search + pagination)', () => {
    beforeAll(async () => {
      for (const name of ['Tom Hanks', 'Tom Hardy', 'Tim Robbins']) {
        await create({ name }).expect(201);
      }
    });

    it('?q= matches part of the name, any case, sorted by name', async () => {
      const res = await request(ctx.http).get('/people?q=TOM').expect(200);
      expect(res.body.data.map((p: { name: string }) => p.name)).toEqual([
        'Tom Hanks',
        'Tom Hardy',
      ]);
      expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 2 });
      expect(res.body.data[0]).toEqual({
        id: expect.any(Number),
        name: 'Tom Hanks',
        photoUrl: null,
      });
    });

    it('paginates', async () => {
      const res = await request(ctx.http)
        .get('/people?q=t&limit=1&page=2')
        .expect(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta.page).toBe(2);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(3);
    });

    it('400: limit over 50', async () => {
      await request(ctx.http).get('/people?limit=51').expect(400);
    });
  });

  describe('update', () => {
    it('partial; null clears; empty body → 400; unknown → 404', async () => {
      const { body } = await create({
        name: 'Elliot Page',
        bio: 'Canadian actor.',
        birthDate: '1987-02-21',
      }).expect(201);

      const res = await update(body.id, { bio: null }).expect(200);
      expect(res.body).toMatchObject({
        name: 'Elliot Page',
        bio: null,
        birthDate: '1987-02-21',
      });

      await update(body.id, {}).expect(400);
      await update(99999, { name: 'x' }).expect(404);
    });
  });

  describe('delete', () => {
    it('204 when the Person has no Credits; again → 404', async () => {
      const { body } = await create({ name: 'Temp Person' }).expect(201);
      const del = () =>
        request(ctx.http).delete(`/people/${body.id}`).set(asAdmin());

      await del().expect(204);
      await del().expect(404);
    });

    it('409 while the Person still has a Credit', async () => {
      const { body: person } = await create({ name: 'Credited' }).expect(201);
      const movie = await ctx.prisma.movie.create({
        data: { title: 'Some Movie', releaseYear: 2000 },
      });
      await ctx.prisma.credit.create({
        data: { movieId: movie.id, personId: person.id, role: 'CAST' },
      });

      const res = await request(ctx.http)
        .delete(`/people/${person.id}`)
        .set(asAdmin())
        .expect(409);
      expect(res.body).toEqual({
        message: 'This Person still has Credits; remove them first',
      });

      // still there, and the filmography shows the Movie
      const page = await request(ctx.http)
        .get(`/people/${person.id}`)
        .expect(200);
      expect(page.body.filmography).toEqual([
        {
          creditId: expect.any(Number),
          role: 'CAST',
          character: null,
          movie: {
            id: movie.id,
            title: 'Some Movie',
            releaseYear: 2000,
            posterUrl: null,
          },
        },
      ]);
    });
  });
});
