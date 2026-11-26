import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Prisma, Review } from '../prisma/generated/prisma/client.js';
import { skipTake, type PageQuery } from '../common/pagination.js';
import { toStoredRating } from './community-rating.js';

export type Tx = Prisma.TransactionClient;

// Author info: id + displayName only. Never email (SPEC-reviews.md).
const authorSelect = {
  id: true,
  displayName: true,
} satisfies Prisma.UserSelect;

export type ReviewWithAuthor = Prisma.ReviewGetPayload<{
  include: { user: { select: typeof authorSelect } };
}>;

const myMovieSelect = {
  id: true,
  title: true,
  releaseYear: true,
  posterUrl: true,
} satisfies Prisma.MovieSelect;

export type ReviewWithMovie = Prisma.ReviewGetPayload<{
  include: { movie: { select: typeof myMovieSelect } };
}>;

@Injectable()
export class ReviewsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Run `work` in one interactive transaction (all or nothing). */
  transaction<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(work);
  }

  /**
   * SELECT … FOR UPDATE on the Movie row. Until this transaction ends, any
   * other transaction that wants to lock the same Movie waits, so two
   * Reviews written at once can't both recompute from a stale count.
   * Returns false when there is no such Movie.
   */
  async lockMovie(tx: Tx, movieId: number): Promise<boolean> {
    const rows = await tx.$queryRaw<{ id: number }[]>`
      SELECT id FROM "Movie" WHERE id = ${movieId} FOR UPDATE
    `;
    return rows.length > 0;
  }

  upsert(
    tx: Tx,
    userId: number,
    movieId: number,
    data: { score: number; comment: string | null },
  ): Promise<Review> {
    return tx.review.upsert({
      where: { userId_movieId: { userId, movieId } },
      create: { userId, movieId, ...data },
      update: data,
    });
  }

  /** `false` when the Member had no Review on that Movie. */
  async delete(tx: Tx, userId: number, movieId: number): Promise<boolean> {
    const { count } = await tx.review.deleteMany({
      where: { userId, movieId },
    });
    return count > 0;
  }

  /** Recompute the Movie's Community Rating from the Reviews table. */
  async recomputeRating(tx: Tx, movieId: number): Promise<void> {
    const { _sum, _count } = await tx.review.aggregate({
      where: { movieId },
      _sum: { score: true },
      _count: { _all: true },
    });
    await tx.movie.update({
      where: { id: movieId },
      data: toStoredRating(_sum.score ?? 0, _count._all),
    });
  }

  async listForMovie(
    movieId: number,
    page: PageQuery,
  ): Promise<{ rows: ReviewWithAuthor[]; total: number }> {
    const where = { movieId };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        include: { user: { select: authorSelect } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        ...skipTake(page),
      }),
      this.prisma.review.count({ where }),
    ]);
    return { rows, total };
  }

  async listForUser(
    userId: number,
    page: PageQuery,
  ): Promise<{ rows: ReviewWithMovie[]; total: number }> {
    const where = { userId };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        include: { movie: { select: myMovieSelect } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        ...skipTake(page),
      }),
      this.prisma.review.count({ where }),
    ]);
    return { rows, total };
  }
}
