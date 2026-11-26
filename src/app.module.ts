import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { envSchema } from './config/env.schema.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { GlobalExceptionFilter } from './common/global-exception.filter.js';
import { IdentityModule } from './identity/identity.module.js';
import { CatalogueModule } from './catalogue/catalogue.module.js';
import { LibraryModule } from './library/library.module.js';
import { ReviewsModule } from './reviews/reviews.module.js';

// identity → catalogue → library → reviews (CAPABILITY-MAP.md).
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envSchema }),
    PrismaModule,
    IdentityModule,
    CatalogueModule,
    LibraryModule,
    ReviewsModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: GlobalExceptionFilter }],
})
export class AppModule {}
