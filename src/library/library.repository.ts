import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Prisma } from '../prisma/generated/prisma/client.js';
import { skipTake, type PageQuery } from '../common/pagination.js';

// The Movie fields a Watchlist / Watched row shows.
export const movieCardSelect = {
  id: true,
  title: true,
  releaseYear: true,
  posterUrl: true,
  ratingAvg: true,
  reviewCount: true,
} satisfies Prisma.MovieSelect;

export type MovieCardRow = Prisma.MovieGetPayload<{
  select: typeof movieCardSelect;
}>;

export type WatchlistRow = { addedAt: Date; movie: MovieCardRow };
export type WatchedRow = { watchedAt: Date; movie: MovieCardRow };

// Anything that can run queries: the normal client OR a transaction client,
// so the reviews module can mark Watched inside its own transaction.
export type Db = Prisma.TransactionClient;

@Injectable()
export class LibraryRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Watchlist ───

  async listWatchlist(
    userId: number,
    page: PageQuery,
  ): Promise<{ rows: WatchlistRow[]; total: number }> {
    const where = { userId };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.watchlistItem.findMany({
        where,
        select: { addedAt: true, movie: { select: movieCardSelect } },
        orderBy: [{ addedAt: 'desc' }, { movieId: 'desc' }],
        ...skipTake(page),
      }),
      this.prisma.watchlistItem.count({ where }),
    ]);
    return { rows, total };
  }

  // ON CONFLICT DO NOTHING: adding twice (or two tabs at once) never errors.
  async addToWatchlist(userId: number, movieId: number): Promise<void> {
    await this.prisma.watchlistItem.createMany({
      data: [{ userId, movieId }],
      skipDuplicates: true,
    });
  }

  async removeFromWatchlist(userId: number, movieId: number): Promise<void> {
    await this.prisma.watchlistItem.deleteMany({ where: { userId, movieId } });
  }

  // ─── Watched ───

  async listWatched(
    userId: number,
    page: PageQuery,
  ): Promise<{ rows: WatchedRow[]; total: number }> {
    const where = { userId };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.watchedEntry.findMany({
        where,
        select: { watchedAt: true, movie: { select: movieCardSelect } },
        orderBy: [{ watchedAt: 'desc' }, { movieId: 'desc' }],
        ...skipTake(page),
      }),
      this.prisma.watchedEntry.count({ where }),
    ]);
    return { rows, total };
  }

  /** Idempotent. Pass `db` to run inside a caller's transaction. */
  async markWatched(
    userId: number,
    movieId: number,
    db: Db = this.prisma,
  ): Promise<void> {
    await db.watchedEntry.createMany({
      data: [{ userId, movieId }],
      skipDuplicates: true,
    });
  }

  async unmarkWatched(userId: number, movieId: number): Promise<void> {
    await this.prisma.watchedEntry.deleteMany({ where: { userId, movieId } });
  }

  // ─── One Movie, from the caller's point of view ───

  // Reads the Review table directly instead of importing the reviews
  // module: reviews already depends on library, and a cycle would be worse.
  async stateFor(userId: number, movieId: number) {
    const key = { userId_movieId: { userId, movieId } };
    const [inWatchlist, watched, review] = await this.prisma.$transaction([
      this.prisma.watchlistItem.count({ where: { userId, movieId } }),
      this.prisma.watchedEntry.count({ where: { userId, movieId } }),
      this.prisma.review.findUnique({
        where: key,
        select: { score: true, comment: true },
      }),
    ]);
    return {
      inWatchlist: inWatchlist > 0,
      watched: watched > 0,
      myReview: review,
    };
  }
}
