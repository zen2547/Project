import request from 'supertest';
import type { App } from 'supertest/types.js';
import type { PrismaClient } from '../../src/prisma/generated/prisma/client.js';
import { seedAdmin } from '../../prisma/seed/admin.js';

let counter = 0;

export type SignedInMember = {
  id: number;
  email: string;
  password: string;
  displayName: string;
  token: string;
};

// Register a fresh Member through the real API and log them in.
// Each call gets a unique email, so tests in one file never collide.
export async function signUpMember(
  http: App,
  overrides: Partial<{
    email: string;
    password: string;
    displayName: string;
  }> = {},
): Promise<SignedInMember> {
  counter += 1;
  const email = overrides.email ?? `member${counter}-${Date.now()}@example.com`;
  const password = overrides.password ?? 'secret123';
  const displayName = overrides.displayName ?? `Member ${counter}`;

  const registered = await request(http)
    .post('/auth/register')
    .send({ email, password, displayName })
    .expect(201);

  const loggedIn = await request(http)
    .post('/auth/login')
    .send({ email, password })
    .expect(200);

  return {
    id: registered.body.id,
    email,
    password,
    displayName,
    token: loggedIn.body.accessToken,
  };
}

export const TEST_ADMIN = {
  ADMIN_EMAIL: 'admin@test.local',
  ADMIN_PASSWORD: 'admin-secret-123',
  ADMIN_DISPLAY_NAME: 'Test Admin',
};

// Create the Admin the same way the real seed does, then log in through the API.
export async function signInAdmin(
  http: App,
  prisma: PrismaClient,
): Promise<SignedInMember> {
  const admin = await seedAdmin(prisma, TEST_ADMIN);

  const loggedIn = await request(http)
    .post('/auth/login')
    .send({
      email: TEST_ADMIN.ADMIN_EMAIL,
      password: TEST_ADMIN.ADMIN_PASSWORD,
    })
    .expect(200);

  return {
    id: admin.id,
    email: admin.email,
    password: TEST_ADMIN.ADMIN_PASSWORD,
    displayName: admin.displayName,
    token: loggedIn.body.accessToken,
  };
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
