import request from 'supertest';
import { closeTestApp, createTestApp, TestContext } from './helpers/app.js';
import {
  bearer,
  signInAdmin,
  signUpMember,
  SignedInMember,
} from './helpers/auth.js';

const LOGO = 'https://cdn.example.com/logo.png';

// Task 8 — SPEC-catalogue.md: Streaming Services ("where to watch").
describe('catalogue: /streaming-services (e2e)', () => {
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

  const create = (body: object) =>
    request(ctx.http)
      .post('/streaming-services')
      .set(bearer(admin.token))
      .send(body);
  const update = (id: number | string, body: object) =>
    request(ctx.http)
      .patch(`/streaming-services/${id}`)
      .set(bearer(admin.token))
      .send(body);

  describe('auth on writes', () => {
    it('401 without a token', async () => {
      await request(ctx.http)
        .post('/streaming-services')
        .send({ name: 'x' })
        .expect(401);
      await request(ctx.http)
        .patch('/streaming-services/1')
        .send({ name: 'x' })
        .expect(401);
      await request(ctx.http).delete('/streaming-services/1').expect(401);
    });

    it('403 for a Member', async () => {
      const asMember = bearer(member.token);
      await request(ctx.http)
        .post('/streaming-services')
        .set(asMember)
        .send({ name: 'x' })
        .expect(403);
      await request(ctx.http)
        .patch('/streaming-services/1')
        .set(asMember)
        .send({ name: 'x' })
        .expect(403);
      await request(ctx.http)
        .delete('/streaming-services/1')
        .set(asMember)
        .expect(403);
    });
  });

  describe('create', () => {
    it('201 with a logo, name trimmed', async () => {
      const res = await create({ name: '  Netflix ', logoUrl: LOGO }).expect(
        201,
      );
      expect(res.body).toEqual({
        id: expect.any(Number),
        name: 'Netflix',
        logoUrl: LOGO,
      });
    });

    it('201 without a logo → logoUrl null', async () => {
      const res = await create({ name: 'Disney+' }).expect(201);
      expect(res.body.logoUrl).toBeNull();
    });

    it('409: duplicate name', async () => {
      const res = await create({ name: 'Netflix' }).expect(409);
      expect(res.body).toEqual({
        message: 'Streaming Service name already exists',
      });
    });

    it('400: logoUrl that is not https', async () => {
      const badLogos = [
        'http://cdn.example.com/logo.png',
        'ftp://cdn.example.com/logo.png',
        'javascript:alert(1)',
        'not a url',
      ];
      for (const [i, logoUrl] of badLogos.entries()) {
        await create({ name: `Bad ${i}`, logoUrl }).expect(400);
      }
    });

    it('400: missing or blank name', async () => {
      await create({ logoUrl: LOGO }).expect(400);
      await create({ name: '   ' }).expect(400);
    });
  });

  describe('list (public)', () => {
    it('200 without a token, sorted by name', async () => {
      await create({ name: 'Apple TV+' }).expect(201);

      const res = await request(ctx.http)
        .get('/streaming-services')
        .expect(200);
      expect(res.body.map((s: { name: string }) => s.name)).toEqual([
        'Apple TV+',
        'Disney+',
        'Netflix',
      ]);
    });
  });

  describe('update', () => {
    it('200: change only the logo, name stays', async () => {
      const { body: row } = await create({ name: 'Max' }).expect(201);

      const res = await update(row.id, { logoUrl: LOGO }).expect(200);
      expect(res.body).toEqual({ id: row.id, name: 'Max', logoUrl: LOGO });
    });

    it('200: logoUrl null removes the logo', async () => {
      const { body: row } = await create({
        name: 'Prime Video',
        logoUrl: LOGO,
      }).expect(201);

      const res = await update(row.id, { logoUrl: null }).expect(200);
      expect(res.body.logoUrl).toBeNull();
    });

    it('400: empty body, or a non-https logo', async () => {
      const { body: row } = await create({ name: 'Hulu' }).expect(201);

      await update(row.id, {}).expect(400);
      await update(row.id, { logoUrl: 'http://x.com/a.png' }).expect(400);
    });

    it('409: renaming to a taken name', async () => {
      const { body: row } = await create({ name: 'Peacock' }).expect(201);
      await update(row.id, { name: 'Netflix' }).expect(409);
    });

    it('404: unknown id; 400: bad id', async () => {
      await update(99999, { name: 'nobody' }).expect(404);
      await update('abc', { name: 'nobody' }).expect(400);
    });
  });

  describe('delete', () => {
    it('204, then it is gone; again → 404', async () => {
      const { body: row } = await create({ name: 'Temp TV' }).expect(201);
      const del = () =>
        request(ctx.http)
          .delete(`/streaming-services/${row.id}`)
          .set(bearer(admin.token));

      await del().expect(204);
      const list = await request(ctx.http)
        .get('/streaming-services')
        .expect(200);
      expect(list.body).not.toContainEqual(row);
      await del().expect(404);
    });
  });
});
