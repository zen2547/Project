import { NotFoundException } from '@nestjs/common';
import { ReviewsService } from './reviews.service.js';
import type { ReviewsRepository, Tx } from './reviews.repository.js';
import type { MoviesRepository } from '../catalogue/movies/movies.repository.js';
import type { LibraryService } from '../library/library.service.js';

const fakeTx = { fake: 'transaction client' } as unknown as Tx;

const savedReview = {
  id: 1,
  userId: 7,
  movieId: 3,
  score: 9,
  comment: null,
  createdAt: new Date('2026-11-26T00:00:00Z'),
  updatedAt: new Date('2026-11-26T00:00:00Z'),
};

describe('ReviewsService', () => {
  let calls: string[];
  let repo: {
    transaction: ReturnType<typeof vi.fn>;
    lockMovie: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    recomputeRating: ReturnType<typeof vi.fn>;
  };
  let library: { markWatched: ReturnType<typeof vi.fn> };
  let service: ReviewsService;

  beforeEach(() => {
    calls = [];
    const track =
      <T>(name: string, value: T) =>
      async () => {
        calls.push(name);
        return value;
      };
    repo = {
      // Run the work right away with a fake transaction client.
      transaction: vi.fn(async (work: (tx: Tx) => Promise<unknown>) =>
        work(fakeTx),
      ),
      lockMovie: vi.fn(track('lock', true)),
      upsert: vi.fn(track('upsert', savedReview)),
      delete: vi.fn(track('delete', true)),
      recomputeRating: vi.fn(track('recompute', undefined)),
    };
    library = { markWatched: vi.fn(track('markWatched', undefined)) };
    service = new ReviewsService(
      repo as unknown as ReviewsRepository,
      {} as MoviesRepository,
      library as unknown as LibraryService,
    );
  });

  it('putReview: lock → upsert → recompute → markWatched, all on the same transaction', async () => {
    await service.putReview(7, 3, { score: 9, comment: null });

    expect(calls).toEqual(['lock', 'upsert', 'recompute', 'markWatched']);
    expect(repo.lockMovie).toHaveBeenCalledWith(fakeTx, 3);
    expect(repo.recomputeRating).toHaveBeenCalledWith(fakeTx, 3);
    expect(library.markWatched).toHaveBeenCalledWith(7, 3, fakeTx);
  });

  it('putReview: unknown Movie → 404 and nothing is written', async () => {
    repo.lockMovie.mockResolvedValue(false);

    await expect(
      service.putReview(7, 99, { score: 9, comment: null }),
    ).rejects.toThrow(new NotFoundException('Movie not found'));
    expect(repo.upsert).not.toHaveBeenCalled();
    expect(library.markWatched).not.toHaveBeenCalled();
  });

  it('putReview returns the Review without userId', async () => {
    const review = await service.putReview(7, 3, { score: 9, comment: null });
    expect(review).toEqual({
      id: 1,
      movieId: 3,
      score: 9,
      comment: null,
      createdAt: savedReview.createdAt,
      updatedAt: savedReview.updatedAt,
    });
  });

  it('deleteReview: recomputes, and does NOT touch Watched', async () => {
    await service.deleteReview(7, 3);
    expect(calls).toEqual(['lock', 'delete', 'recompute']);
    expect(library.markWatched).not.toHaveBeenCalled();
  });

  it('deleteReview: no own Review → 404, no recompute', async () => {
    repo.delete.mockResolvedValue(false);
    await expect(service.deleteReview(7, 3)).rejects.toThrow(NotFoundException);
    expect(repo.recomputeRating).not.toHaveBeenCalled();
  });
});
