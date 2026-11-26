import request from 'supertest';
import { closeTestApp, createTestApp, TestContext } from './helpers/app.js';
import {
  bearer,
  signInAdmin,
  signUpMember,
  SignedInMember,
} from './helpers/auth.js';

// Task 7 — SPEC-catalogue.md: Genres and Keywords (the chips on a Movie page).
// Both resources behave the same, so one suite runs for each.
describe.each([
  { path: '/genres', label: 'Genre', a: 'Drama', b: 'Sci-Fi', c: 'Action' },
  { path: '/keywords', label: 'Keyword', a: 'dream', b: 'heist', c: 'prison' },
])('catalogue: $path (e2e)', ({ path, label, a, b, c }) => {
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
  const create = (name: string) =>
    request(ctx.http).post(path).set(asAdmin()).send({ name });

  describe('auth on writes', () => {
    it('401: POST, PATCH and DELETE without a token', async () => {
      await request(ctx.http).post(path).send({ name: 'x' }).expect(401);
      await request(ctx.http)
        .patch(`${path}/1`)
        .send({ name: 'x' })
        .expect(401);
      await request(ctx.http).delete(`${path}/1`).expect(401);
    });

    it('403: POST, PATCH and DELETE as a Member', async () => {
      const asMember = bearer(member.token);
      await request(ctx.http)
        .post(path)
        .set(asMember)
        .send({ name: 'x' })
        .expect(403);
      await request(ctx.http)
        .patch(`${path}/1`)
        .set(asMember)
        .send({ name: 'x' })
        .expect(403);
      await request(ctx.http).delete(`${path}/1`).set(asMember).expect(403);
    });
  });

  describe('create', () => {
    it('201: Admin creates one, name trimmed', async () => {
      const res = await create(`  ${a}  `).expect(201);
      expect(res.body).toEqual({ id: expect.any(Number), name: a });
    });

    it('409: the same name twice', async () => {
      await create(b).expect(201);
      const res = await create(b).expect(409);
      expect(res.body).toEqual({ message: `${label} name already exists` });
    });

    it('400: empty, blank, missing or too long name', async () => {
      await create('').expect(400);
      await create('   ').expect(400);
      await request(ctx.http).post(path).set(asAdmin()).send({}).expect(400);
      await create('x'.repeat(51)).expect(400);
    });
  });

  describe('list (public)', () => {
    it('200 without a token, sorted by name', async () => {
      await create(c).expect(201);

      const res = await request(ctx.http).get(path).expect(200);
      const names = res.body.map((row: { name: string }) => row.name);
      expect(names).toEqual([...names].sort((x, y) => x.localeCompare(y)));
      expect(names).toEqual(expect.arrayContaining([a, b, c]));
    });
  });

  describe('rename', () => {
    it('200: Admin renames one', async () => {
      const { body: row } = await create(`${a} old`).expect(201);

      const res = await request(ctx.http)
        .patch(`${path}/${row.id}`)
        .set(asAdmin())
        .send({ name: `${a} new` })
        .expect(200);
      expect(res.body).toEqual({ id: row.id, name: `${a} new` });
    });

    it('409: renaming to a name that is taken', async () => {
      const { body: row } = await create(`${b} 2`).expect(201);

      await request(ctx.http)
        .patch(`${path}/${row.id}`)
        .set(asAdmin())
        .send({ name: b })
        .expect(409);
    });

    it('404: unknown id', async () => {
      const res = await request(ctx.http)
        .patch(`${path}/99999`)
        .set(asAdmin())
        .send({ name: 'nobody' })
        .expect(404);
      expect(res.body).toEqual({ message: `${label} not found` });
    });

    it('400: id that is not a positive integer', async () => {
      for (const bad of ['abc', '0', '-1', '1.5']) {
        await request(ctx.http)
          .patch(`${path}/${bad}`)
          .set(asAdmin())
          .send({ name: 'x' })
          .expect(400);
      }
    });
  });

  describe('delete', () => {
    it('204, then it is gone from the list', async () => {
      const { body: row } = await create(`${c} temp`).expect(201);

      await request(ctx.http)
        .delete(`${path}/${row.id}`)
        .set(asAdmin())
        .expect(204);

      const list = await request(ctx.http).get(path).expect(200);
      expect(list.body).not.toContainEqual(row);
    });

    it('404: unknown id', async () => {
      await request(ctx.http)
        .delete(`${path}/99999`)
        .set(asAdmin())
        .expect(404);
    });
  });
});
