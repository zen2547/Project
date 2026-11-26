// Entry point for `pnpm prisma db seed` (wired in prisma.config.ts).
// Grows with the modules: Admin, the catalogue (Task 14), Reviews in Task 20.
// ⚠️ Re-running REPLACES the catalogue (Movies, People, Genres…) in the
// database DATABASE_URL points at. Members and the Admin are kept.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/prisma/generated/prisma/client.js';
import { adminEnvSchema, seedAdmin } from './seed/admin.js';
import { seedCatalogue } from './seed/catalogue.js';

async function main() {
  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) throw new Error('DATABASE_URL is not set');

  // Fail fast with a readable message if ADMIN_* is missing or invalid.
  const adminEnv = adminEnvSchema.parse(process.env);

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });
  try {
    const admin = await seedAdmin(prisma, adminEnv);
    console.log(`✔ Admin ready: ${admin.email} (id ${admin.id})`);

    const catalogue = await seedCatalogue(prisma);
    console.log(
      `✔ Catalogue replaced: ${catalogue.movies} Movies, ${catalogue.people} People`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
