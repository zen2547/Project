import { INestApplication, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { App } from 'supertest/types.js';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { resetDatabase } from './db.js';

export type TestContext = {
  app: INestApplication<App>;
  prisma: PrismaService;
  http: App;
};

export type TestAppOptions = {
  // Extra controllers that exist only in tests (e.g. to exercise a guard
  // before any real route uses it). Global guards apply to them too.
  controllers?: Type[];
};

// Boot the real AppModule exactly like main.ts does, on an empty imdb_test.
// Use in beforeAll; pair with closeTestApp in afterAll.
export async function createTestApp(
  options: TestAppOptions = {},
): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
    controllers: options.controllers ?? [],
  }).compile();

  const app = configureApp(
    moduleRef.createNestApplication<INestApplication<App>>(),
  );
  await app.init();

  const prisma = app.get(PrismaService);
  await resetDatabase(prisma);

  return { app, prisma, http: app.getHttpServer() };
}

export async function closeTestApp(
  ctx: TestContext | undefined,
): Promise<void> {
  await ctx?.app.close();
}
