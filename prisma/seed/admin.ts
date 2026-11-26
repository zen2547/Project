import * as argon2 from 'argon2';
import z from 'zod';
import type { PrismaClient } from '../../src/prisma/generated/prisma/client.js';

export const adminEnvSchema = z.object({
  ADMIN_EMAIL: z.string().trim().toLowerCase().pipe(z.email()),
  ADMIN_PASSWORD: z.string().min(8),
  ADMIN_DISPLAY_NAME: z.string().trim().min(2).max(40),
});

export type AdminEnv = z.infer<typeof adminEnvSchema>;

// The only way an Admin comes to exist in V1 (SPEC-identity.md → Rules).
// Upsert keyed on email, so running the seed again never fails or duplicates:
// it just re-applies whatever .env says (role, name, password).
export async function seedAdmin(prisma: PrismaClient, env: AdminEnv) {
  const passwordHash = await argon2.hash(env.ADMIN_PASSWORD);

  return prisma.user.upsert({
    where: { email: env.ADMIN_EMAIL },
    create: {
      email: env.ADMIN_EMAIL,
      passwordHash,
      displayName: env.ADMIN_DISPLAY_NAME,
      role: 'ADMIN',
    },
    update: {
      passwordHash,
      displayName: env.ADMIN_DISPLAY_NAME,
      role: 'ADMIN',
    },
  });
}
