import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../identity/decorators/current-user.decorator.js';
import type { PageQuery } from '../common/pagination.js';
import { ReviewsService } from './reviews.service.js';
import { reviewPageSchema } from './dto/review.dto.js';

@Controller('me/reviews')
export class MeReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  list(
    @CurrentUser('id') userId: number,
    @Query({ schema: reviewPageSchema }) page: PageQuery,
  ) {
    return this.reviews.listMine(userId, page);
  }
}
