import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  Query,
} from '@nestjs/common';
import { Public } from '../identity/decorators/public.decorator.js';
import { CurrentUser } from '../identity/decorators/current-user.decorator.js';
import { idParamSchema } from '../common/id-param.schema.js';
import type { PageQuery } from '../common/pagination.js';
import { ReviewsService } from './reviews.service.js';
import {
  putReviewSchema,
  reviewPageSchema,
  type PutReviewDto,
} from './dto/review.dto.js';

// `review` (singular) is the caller's own one: a Member has at most one per
// Movie, so PUT is create-or-replace and there is no review id in the URL.
@Controller('movies/:movieId')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Public()
  @Get('reviews')
  list(
    @Param('movieId', { schema: idParamSchema }) movieId: number,
    @Query({ schema: reviewPageSchema }) page: PageQuery,
  ) {
    return this.reviews.listForMovie(movieId, page);
  }

  @Put('review')
  put(
    @CurrentUser('id') userId: number,
    @Param('movieId', { schema: idParamSchema }) movieId: number,
    @Body({ schema: putReviewSchema }) dto: PutReviewDto,
  ) {
    return this.reviews.putReview(userId, movieId, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('review')
  delete(
    @CurrentUser('id') userId: number,
    @Param('movieId', { schema: idParamSchema }) movieId: number,
  ) {
    return this.reviews.deleteReview(userId, movieId);
  }
}
