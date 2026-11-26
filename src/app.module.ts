import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { envSchema } from './config/env.schema.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { GlobalExceptionFilter } from './common/global-exception.filter.js';
import { IdentityModule } from './identity/identity.module.js';
import { CatalogueModule } from './catalogue/catalogue.module.js';

// Feature modules (reviews, library) are added task by task.
// See tasks/todo.md.
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envSchema }),
    PrismaModule,
    IdentityModule,
    CatalogueModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: GlobalExceptionFilter }],
})
export class AppModule {}
