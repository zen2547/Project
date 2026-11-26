import { Injectable, NotFoundException } from '@nestjs/common';
import { MoviesRepository } from '../catalogue/movies/movies.repository.js';
import { toCommunityRating } from '../catalogue/movies/movie-page.js';
import { toPage, type Page, type PageQuery } from '../common/pagination.js';
import {
  LibraryRepository,
  type Db,
  type MovieCardRow,
} from './library.repository.js';

export type MovieCard = {
  id: number;
  title: string;
  releaseYear: number;
  posterUrl: string | null;
  communityRating: { average: number; count: number } | null;
};

export const toMovieCard = (m: MovieCardRow): MovieCard => ({
  id: m.id,
  title: m.title,
  releaseYear: m.releaseYear,
  posterUrl: m.posterUrl,
  communityRating: toCommunityRating(m.ratingAvg, m.reviewCount),
});

export type MyMovieState = {
  inWatchlist: boolean;
  watched: boolean;
  myReview: { score: number; comment: string | null } | null;
};

// A Member's private Watchlist and Watched lists. Every method takes the
// caller's own userId (from the JWT), so nobody can reach someone else's.
@Injectable()
export class LibraryService {
  constructor(
    private readonly library: LibraryRepository,
    private readonly movies: MoviesRepository,
  ) {}

  async watchlist(
    userId: number,
    page: PageQuery,
  ): Promise<Page<{ addedAt: Date; movie: MovieCard }>> {
    const { rows, total } = await this.library.listWatchlist(userId, page);
    const data = rows.map((r) => ({
      addedAt: r.addedAt,
      movie: toMovieCard(r.movie),
    }));
    return toPage(data, total, page);
  }

  async addToWatchlist(userId: number, movieId: number): Promise<void> {
    await this.assertMovieExists(movieId);
    await this.library.addToWatchlist(userId, movieId);
  }

  async removeFromWatchlist(userId: number, movieId: number): Promise<void> {
    await this.assertMovieExists(movieId);
    await this.library.removeFromWatchlist(userId, movieId);
  }

  async watched(
    userId: number,
    page: PageQuery,
  ): Promise<Page<{ watchedAt: Date; movie: MovieCard }>> {
    const { rows, total } = await this.library.listWatched(userId, page);
    const data = rows.map((r) => ({
      watchedAt: r.watchedAt,
      movie: toMovieCard(r.movie),
    }));
    return toPage(data, total, page);
  }

  async markWatchedByMember(userId: number, movieId: number): Promise<void> {
    await this.assertMovieExists(movieId);
    await this.library.markWatched(userId, movieId);
  }

  async unmarkWatched(userId: number, movieId: number): Promise<void> {
    await this.assertMovieExists(movieId);
    await this.library.unmarkWatched(userId, movieId);
  }

  /**
   * For other modules (reviews): mark a Movie Watched without any checks,
   * optionally inside the caller's transaction (`db`). The caller has
   * already made sure the Movie exists.
   */
  markWatched(userId: number, movieId: number, db?: Db): Promise<void> {
    return this.library.markWatched(userId, movieId, db);
  }

  async stateFor(userId: number, movieId: number): Promise<MyMovieState> {
    await this.assertMovieExists(movieId);
    return this.library.stateFor(userId, movieId);
  }

  private async assertMovieExists(movieId: number): Promise<void> {
    if (!(await this.movies.exists(movieId))) {
      throw new NotFoundException('Movie not found');
    }
  }
}
