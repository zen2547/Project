import { Controller, Get } from '@nestjs/common';
import * as argon2 from 'argon2';
import request from 'supertest';
import { Role } from '../src/identity/decorators/role.decorator.js';
import { seedAdmin } from '../prisma/seed/admin.js';
import { closeTestApp, createTestApp, TestContext } from './helpers/app.js';
import {
  bearer,
  signInAdmin,
  signUpMember,
  SignedInMember,
  TEST_ADMIN,
} from './helpers/auth.js';

// No real Admin route exists until Task 7, so prove the guard on test-only ones.
@Controller('__test__')
class GuardProbeController {
  @Role('ADMIN')
  @Get('admin-only')
  adminOnly() {
    return { ok: true };
  }

  @Get('members')
  anyMember() {
    return { ok: true };
  }
}

// SPEC-identity.md → Success Criteria (roles + seeded Admin)
describe('identity: @Role("ADMIN") (e2e)', () => {
  let ctx: TestContext;
  let member: SignedInMember;
  let admin: SignedInMember;

  beforeAll(async () => {
    ctx = await createTestApp({ controllers: [GuardProbeController] });
    member = await signUpMember(ctx.http);
    admin = await signInAdmin(ctx.http, ctx.prisma);
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  it('401: no token', async () => {
    await request(ctx.http).get('/__test__/admin-only').expect(401);
  });

  it('403: a Member', async () => {
    const res = await request(ctx.http)
      .get('/__test__/admin-only')
      .set(bearer(member.token))
      .expect(403);

    expect(res.body).toEqual({
      message: 'You do not have permission to do this',
    });
  });

  it('200: the seeded Admin', async () => {
    await request(ctx.http)
      .get('/__test__/admin-only')
      .set(bearer(admin.token))
      .expect(200, { ok: true });
  });

  it('routes without @Role still accept any signed-in Member', async () => {
    await request(ctx.http)
      .get('/__test__/members')
      .set(bearer(member.token))
      .expect(200);
  });

  it('the Admin profile says role ADMIN', async () => {
    const res = await request(ctx.http)
      .get('/auth/me')
      .set(bearer(admin.token))
      .expect(200);

    expect(res.body.role).toBe('ADMIN');
  });
});

describe('identity: seedAdmin (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  it('is re-runnable: twice in a row leaves exactly one Admin', async () => {
    await seedAdmin(ctx.prisma, TEST_ADMIN);
    await seedAdmin(ctx.prisma, TEST_ADMIN);

    const admins = await ctx.prisma.user.findMany({
      where: { email: TEST_ADMIN.ADMIN_EMAIL },
    });
    expect(admins).toHaveLength(1);
    expect(admins[0].role).toBe('ADMIN');
  });

  it('the seeded Admin can log in with the .env password', async () => {
    await seedAdmin(ctx.prisma, TEST_ADMIN);

    await request(ctx.http)
      .post('/auth/login')
      .send({
        email: TEST_ADMIN.ADMIN_EMAIL,
        password: TEST_ADMIN.ADMIN_PASSWORD,
      })
      .expect(200);
  });

  it('stores a hash, not the plain password', async () => {
    const admin = await seedAdmin(ctx.prisma, TEST_ADMIN);

    expect(admin.passwordHash).not.toBe(TEST_ADMIN.ADMIN_PASSWORD);
    expect(
      await argon2.verify(admin.passwordHash, TEST_ADMIN.ADMIN_PASSWORD),
    ).toBe(true);
  });
});
