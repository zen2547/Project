import request from 'supertest';
import { closeTestApp, createTestApp, TestContext } from './helpers/app.js';
import {
  bearer,
  signInAdmin,
  signUpMember,
  SignedInMember,
} from './helpers/auth.js';

// Task 12 — SPEC-catalogue.md: Credits; the Movie page shows Directors,
// Writers and the top 3 Stars.
describe('catalogue: /movies/:movieId/credits (e2e)', () => {
  let ctx: TestContext;
  let admin: SignedInMember;
  let member: SignedInMember;
  const person: Record<string, number> = {};

  const asAdmin = () => bearer(admin.token);
  const newMovie = async (title: string) =>
    (
      await request(ctx.http)
        .post('/movies')
        .set(asAdmin())
        .send({ title, releaseYear: 2010 })
        .expect(201)
    ).body.id as number;
  const addCredit = (movieId: number | string, body: object) =>
    request(ctx.http)
      .post(`/movies/${movieId}/credits`)
      .set(asAdmin())
      .send(body);

  beforeAll(async () => {
    ctx = await createTestApp();
    admin = await signInAdmin(ctx.http, ctx.prisma);
    member = await signUpMember(ctx.http);
    for (const name of [
      'Christopher Nolan',
      'Leonardo DiCaprio',
      'Joseph Gordon-Levitt',
      'Elliot Page',
      'Tom Hardy',
    ]) {
      person[name] = (
        await request(ctx.http)
          .post('/people')
          .set(asAdmin())
          .send({ name })
          .expect(201)
      ).body.id;
    }
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  it('401 without a token, 403 for a Member', async () => {
    const movieId = await newMovie('Auth check');
    const body = { personId: person['Tom Hardy'], role: 'CAST' };

    await request(ctx.http)
      .post(`/movies/${movieId}/credits`)
      .send(body)
      .expect(401);
    await request(ctx.http)
      .post(`/movies/${movieId}/credits`)
      .set(bearer(member.token))
      .send(body)
      .expect(403);
    await request(ctx.http)
      .patch(`/movies/${movieId}/credits/1`)
      .set(bearer(member.token))
      .send({ order: 1 })
      .expect(403);
    await request(ctx.http)
      .delete(`/movies/${movieId}/credits/1`)
      .set(bearer(member.token))
      .expect(403);
  });

  describe('a fully credited Movie', () => {
    let movieId: number;

    beforeAll(async () => {
      movieId = await newMovie('Inception');
      const nolan = person['Christopher Nolan'];
      await addCredit(movieId, { personId: nolan, role: 'DIRECTOR' }).expect(
        201,
      );
      await addCredit(movieId, { personId: nolan, role: 'WRITER' }).expect(201);
      // Added out of billing order on purpose.
      const cast: [string, string, number][] = [
        ['Tom Hardy', 'Eames', 3],
        ['Leonardo DiCaprio', 'Cobb', 0],
        ['Elliot Page', 'Ariadne', 2],
        ['Joseph Gordon-Levitt', 'Arthur', 1],
      ];
      for (const [name, character, order] of cast) {
        await addCredit(movieId, {
          personId: person[name],
          role: 'CAST',
          character,
          order,
        }).expect(201);
      }
    });

    it('POST returns the Credit', async () => {
      const otherMovie = await newMovie('Return shape');
      const res = await addCredit(otherMovie, {
        personId: person['Tom Hardy'],
        role: 'CAST',
        character: ' Bane ',
        order: 4,
      }).expect(201);

      expect(res.body).toEqual({
        creditId: expect.any(Number),
        personId: person['Tom Hardy'],
        name: 'Tom Hardy',
        role: 'CAST',
        character: 'Bane',
        order: 4,
      });
    });

    it('GET /movies/:id: directors, writers and exactly 3 stars by order', async () => {
      const page = await request(ctx.http)
        .get(`/movies/${movieId}`)
        .expect(200);

      expect(page.body.directors).toEqual([
        { personId: person['Christopher Nolan'], name: 'Christopher Nolan' },
      ]);
      expect(page.body.writers).toEqual([
        { personId: person['Christopher Nolan'], name: 'Christopher Nolan' },
      ]);
      expect(page.body.stars).toEqual([
        {
          personId: person['Leonardo DiCaprio'],
          name: 'Leonardo DiCaprio',
          character: 'Cobb',
        },
        {
          personId: person['Joseph Gordon-Levitt'],
          name: 'Joseph Gordon-Levitt',
          character: 'Arthur',
        },
        {
          personId: person['Elliot Page'],
          name: 'Elliot Page',
          character: 'Ariadne',
        },
      ]);
    });

    it('GET /movies/:id/credits: full cast & crew, grouped, Guests allowed', async () => {
      const res = await request(ctx.http)
        .get(`/movies/${movieId}/credits`)
        .expect(200);

      expect(res.body.directors).toHaveLength(1);
      expect(res.body.writers).toHaveLength(1);
      expect(res.body.cast.map((c: { name: string }) => c.name)).toEqual([
        'Leonardo DiCaprio',
        'Joseph Gordon-Levitt',
        'Elliot Page',
        'Tom Hardy',
      ]);
    });

    it('GET /people/:id lists the Movie with each role', async () => {
      const res = await request(ctx.http)
        .get(`/people/${person['Christopher Nolan']}`)
        .expect(200);
      const onInception = res.body.filmography.filter(
        (f: { movie: { id: number } }) => f.movie.id === movieId,
      );
      expect(onInception.map((f: { role: string }) => f.role).sort()).toEqual([
        'DIRECTOR',
        'WRITER',
      ]);
    });

    it('PATCH order moves a Star; PATCH character on a DIRECTOR → 400', async () => {
      const { body: credits } = await request(ctx.http)
        .get(`/movies/${movieId}/credits`)
        .expect(200);
      const hardy = credits.cast.find(
        (c: { name: string }) => c.name === 'Tom Hardy',
      );
      const nolanDirector = credits.directors[0];

      const res = await request(ctx.http)
        .patch(`/movies/${movieId}/credits/${hardy.creditId}`)
        .set(asAdmin())
        .send({ order: 0, character: 'Eames the Forger' })
        .expect(200);
      expect(res.body).toMatchObject({
        order: 0,
        character: 'Eames the Forger',
      });

      const page = await request(ctx.http)
        .get(`/movies/${movieId}`)
        .expect(200);
      expect(page.body.stars.map((s: { name: string }) => s.name)).toContain(
        'Tom Hardy',
      );

      const bad = await request(ctx.http)
        .patch(`/movies/${movieId}/credits/${nolanDirector.creditId}`)
        .set(asAdmin())
        .send({ character: 'Himself' })
        .expect(400);
      expect(bad.body).toEqual({
        message: 'character is only allowed on CAST credits',
      });
    });

    it('PATCH: empty body → 400; a Credit of another Movie → 404', async () => {
      const { body: credits } = await request(ctx.http)
        .get(`/movies/${movieId}/credits`)
        .expect(200);
      const creditId = credits.cast[0].creditId;
      const otherMovie = await newMovie('Other');

      await request(ctx.http)
        .patch(`/movies/${movieId}/credits/${creditId}`)
        .set(asAdmin())
        .send({})
        .expect(400);
      await request(ctx.http)
        .patch(`/movies/${otherMovie}/credits/${creditId}`)
        .set(asAdmin())
        .send({ order: 9 })
        .expect(404);
    });
  });

  describe('rules', () => {
    it('400: character on a non-CAST credit', async () => {
      const movieId = await newMovie('Rule: character');
      const res = await addCredit(movieId, {
        personId: person['Christopher Nolan'],
        role: 'DIRECTOR',
        character: 'Himself',
      }).expect(400);
      expect(JSON.stringify(res.body.message)).toContain(
        'character is only allowed on CAST credits',
      );
    });

    it('409: same Person + Movie + role twice', async () => {
      const movieId = await newMovie('Rule: duplicate');
      const body = { personId: person['Tom Hardy'], role: 'CAST' };
      await addCredit(movieId, body).expect(201);
      const res = await addCredit(movieId, body).expect(409);
      expect(res.body).toEqual({
        message: 'This Person already has that role on this Movie',
      });
    });

    it('400: unknown personId, named', async () => {
      const movieId = await newMovie('Rule: person');
      const res = await addCredit(movieId, {
        personId: 99999,
        role: 'CAST',
      }).expect(400);
      expect(res.body).toEqual({ message: 'Unknown personId: 99999' });
    });

    it('404: unknown Movie (POST and GET)', async () => {
      await addCredit(99999, {
        personId: person['Tom Hardy'],
        role: 'CAST',
      }).expect(404);
      await request(ctx.http).get('/movies/99999/credits').expect(404);
    });

    it('400: bad role, negative order', async () => {
      const movieId = await newMovie('Rule: shape');
      const personId = person['Tom Hardy'];
      await addCredit(movieId, { personId, role: 'PRODUCER' }).expect(400);
      await addCredit(movieId, { personId, role: 'CAST', order: -1 }).expect(
        400,
      );
    });
  });

  describe('delete', () => {
    it('204, then 404; the Person can now be deleted', async () => {
      const movieId = await newMovie('Delete credit');
      const { body: p } = await request(ctx.http)
        .post('/people')
        .set(asAdmin())
        .send({ name: 'One Credit Only' })
        .expect(201);
      const { body: credit } = await addCredit(movieId, {
        personId: p.id,
        role: 'CAST',
      }).expect(201);

      // still credited → 409
      await request(ctx.http)
        .delete(`/people/${p.id}`)
        .set(asAdmin())
        .expect(409);

      const del = () =>
        request(ctx.http)
          .delete(`/movies/${movieId}/credits/${credit.creditId}`)
          .set(asAdmin());
      await del().expect(204);
      await del().expect(404);

      await request(ctx.http)
        .delete(`/people/${p.id}`)
        .set(asAdmin())
        .expect(204);
    });
  });
});
