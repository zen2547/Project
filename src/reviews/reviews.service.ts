import { Injectable, NotFoundException } from '@nestjs/common';
import { MoviesRepository } from '../catalogue/movies/movies.repository.js';
import { LibraryService } from '../library/library.service.js';
import { toPage, type Page, type PageQuery } from '../common/pagination.js';
import type { Review } from '../prisma/generated/prisma/client.js';
import {
  ReviewsRepository,
  type ReviewWithAuthor,
  type ReviewWithMovie,
} from './reviews.repository.js';
import type { PutReviewDto } from './dto/review.dto.js';

export type MyReview = {
  id: number;
  movieId: number;
  score: number;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const toMyReview = (r: Review): MyReview => ({
  id: r.id,
  movieId: r.movieId,
  score: r.score,
  comment: r.comment,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
});

const toPublicReview = (r: ReviewWithAuthor) => ({
  id: r.id,
  score: r.score,
  comment: r.comment,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
  author: { id: r.user.id, displayName: r.user.displayName },
});

const toMyListedReview = (r: ReviewWithMovie) => ({
  ...toMyReview(r),
  movie: r.movie,
});

const movieNotFound = () => new NotFoundException('Movie not found');

@Injectable()
export class ReviewsService {
  constructor(
    private readonly reviews: ReviewsRepository,
    private readonly movies: MoviesRepository,
    private readonly library: LibraryService,
  ) {}

  /**
   * Create or replace the caller's Review. One transaction:
   * lock Movie → write Review → recompute Community Rating → mark Watched.
   * If any step fails, none of it is saved.
   */
  putReview(
    userId: number,
    movieId: number,
    dto: PutReviewDto,
  ): Promise<MyReview> {
    return this.reviews.transaction(async (tx) => {
      if (!(await this.reviews.lockMovie(tx, movieId))) throw movieNotFound();

      const review = await this.reviews.upsert(tx, userId, movieId, {
        score: dto.score,
        comment: dto.comment,
      });
      await this.reviews.recomputeRating(tx, movieId);
      await this.library.markWatched(userId, movieId, tx);

      return toMyReview(review);
    });
  }

  /** Same transaction shape; Watched is NOT undone (SPEC-reviews.md). */
  deleteReview(userId: number, movieId: number): Promise<void> {
    return this.reviews.transaction(async (tx) => {
      if (!(await this.reviews.lockMovie(tx, movieId))) throw movieNotFound();

      if (!(await this.reviews.delete(tx, userId, movieId))) {
        throw new NotFoundException('You have no Review on this Movie');
      }
      await this.reviews.recomputeRating(tx, movieId);
    });
  }

  async listForMovie(movieId: number, page: PageQuery) {
    if (!(await this.movies.exists(movieId))) throw movieNotFound();
    const { rows, total } = await this.reviews.listForMovie(movieId, page);
    return toPage(rows.map(toPublicReview), total, page);
  }

  async listMine(
    userId: number,
    page: PageQuery,
  ): Promise<Page<ReturnType<typeof toMyListedReview>>> {
    const { rows, total } = await this.reviews.listForUser(userId, page);
    return toPage(rows.map(toMyListedReview), total, page);
  }
}
