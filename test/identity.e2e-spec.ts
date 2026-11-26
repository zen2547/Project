import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { closeTestApp, createTestApp, TestContext } from './helpers/app.js';
import { bearer, signUpMember, SignedInMember } from './helpers/auth.js';

// SPEC-identity.md → Success Criteria (register)
describe('identity: POST /auth/register (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  const register = (body: object) =>
    request(ctx.http).post('/auth/register').send(body);

  it('201: creates a MEMBER and returns no passwordHash', async () => {
    const res = await register({
      email: 'new@example.com',
      password: 'secret123',
      displayName: 'Newbie',
    }).expect(201);

    expect(res.body).toEqual({
      id: expect.any(Number),
      email: 'new@example.com',
      displayName: 'Newbie',
      role: 'MEMBER',
    });
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('stores a hash, not the plain password', async () => {
    await register({
      email: 'hash@example.com',
      password: 'secret123',
      displayName: 'Hasher',
    }).expect(201);

    const row = await ctx.prisma.user.findUniqueOrThrow({
      where: { email: 'hash@example.com' },
    });
    expect(row.passwordHash).not.toBe('secret123');
    expect(row.passwordHash).toMatch(/^\$argon2/);
  });

  it('normalises email: trims and lower-cases it', async () => {
    const res = await register({
      email: '  Mixed.Case@Example.COM ',
      password: 'secret123',
      displayName: 'Mixed',
    }).expect(201);

    expect(res.body.email).toBe('mixed.case@example.com');
  });

  it('409: same email again, in any letter case', async () => {
    await register({
      email: 'taken@example.com',
      password: 'secret123',
      displayName: 'First',
    }).expect(201);

    const res = await register({
      email: 'TAKEN@Example.com',
      password: 'another123',
      displayName: 'Second',
    }).expect(409);

    expect(res.body).toEqual({ message: 'Email already in use' });
  });

  it('ignores a role in the body: sign-ups are always MEMBER', async () => {
    const res = await register({
      email: 'sneaky@example.com',
      password: 'secret123',
      displayName: 'Sneaky',
      role: 'ADMIN',
    }).expect(201);

    expect(res.body.role).toBe('MEMBER');
  });

  it.each([
    [
      '7-character password',
      { email: 'a@example.com', password: '1234567', displayName: 'Ann' },
    ],
    ['missing displayName', { email: 'b@example.com', password: 'secret123' }],
    [
      '1-character displayName',
      { email: 'c@example.com', password: 'secret123', displayName: 'C' },
    ],
    [
      'invalid email',
      { email: 'not-an-email', password: 'secret123', displayName: 'Dee' },
    ],
  ])('400: %s', async (_case, body) => {
    const res = await register(body).expect(400);
    expect(res.body).toHaveProperty('message');
  });
});

// SPEC-identity.md → Success Criteria (login + /auth/me)
describe('identity: POST /auth/login and GET /auth/me (e2e)', () => {
  let ctx: TestContext;
  let member: SignedInMember;

  beforeAll(async () => {
    ctx = await createTestApp();
    member = await signUpMember(ctx.http, {
      email: 'login@example.com',
      password: 'secret123',
      displayName: 'Logan',
    });
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  const login = (body: object) =>
    request(ctx.http).post('/auth/login').send(body);

  it('200: correct credentials return { accessToken }', async () => {
    const res = await login({
      email: 'login@example.com',
      password: 'secret123',
    }).expect(200);

    expect(res.body).toEqual({ accessToken: expect.any(String) });
  });

  it('accepts the email in any letter case', async () => {
    await login({
      email: '  LOGIN@Example.com ',
      password: 'secret123',
    }).expect(200);
  });

  it('401: wrong email and wrong password give the same message', async () => {
    const wrongEmail = await login({
      email: 'nobody@example.com',
      password: 'secret123',
    }).expect(401);
    const wrongPassword = await login({
      email: 'login@example.com',
      password: 'not-it-123',
    }).expect(401);

    expect(wrongEmail.body).toEqual({ message: 'Invalid email or password' });
    expect(wrongPassword.body).toEqual(wrongEmail.body);
  });

  it('400: missing password', async () => {
    await login({ email: 'login@example.com' }).expect(400);
  });

  it('GET /auth/me 200: returns the caller profile, no passwordHash', async () => {
    const res = await request(ctx.http)
      .get('/auth/me')
      .set(bearer(member.token))
      .expect(200);

    expect(res.body).toEqual({
      id: member.id,
      email: 'login@example.com',
      displayName: 'Logan',
      role: 'MEMBER',
      createdAt: expect.any(String),
    });
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it.each([
    ['no Authorization header', undefined],
    ['wrong scheme', 'Basic abc123'],
    ['"Bearer" with no token', 'Bearer'],
    ['garbage token', 'Bearer not.a.jwt'],
  ])('GET /auth/me 401: %s', async (_case, header) => {
    const req = request(ctx.http).get('/auth/me');
    if (header) req.set('Authorization', header);
    const res = await req.expect(401);
    expect(res.body).toHaveProperty('message');
  });

  it('GET /auth/me 401: token signed with another secret', async () => {
    const forged = await ctx.app
      .get(JwtService)
      .signAsync(
        { sub: String(member.id), role: 'ADMIN' },
        { secret: 'x'.repeat(40) },
      );

    await request(ctx.http).get('/auth/me').set(bearer(forged)).expect(401);
  });

  it('GET /auth/me 401: expired token', async () => {
    const expired = await ctx.app
      .get(JwtService)
      .signAsync(
        { sub: String(member.id), role: 'MEMBER' },
        { expiresIn: -10 },
      );

    await request(ctx.http).get('/auth/me').set(bearer(expired)).expect(401);
  });

  it('GET /auth/me 401: valid token for an account that was deleted', async () => {
    const ghost = await signUpMember(ctx.http);
    await ctx.prisma.user.delete({ where: { id: ghost.id } });

    await request(ctx.http)
      .get('/auth/me')
      .set(bearer(ghost.token))
      .expect(401);
  });
});
