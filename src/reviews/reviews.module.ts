import { Module } from '@nestjs/common';
import { CatalogueModule } from '../catalogue/catalogue.module.js';
import { LibraryModule } from '../library/library.module.js';
import { ReviewsRepository } from './reviews.repository.js';
import { ReviewsService } from './reviews.service.js';
import { ReviewsController } from './reviews.controller.js';
import { MeReviewsController } from './me-reviews.controller.js';

// SPEC-reviews.md: Reviews and the Community Rating they keep up to date.
@Module({
  imports: [CatalogueModule, LibraryModule],
  controllers: [ReviewsController, MeReviewsController],
  providers: [ReviewsRepository, ReviewsService],
})
export class ReviewsModule {}
