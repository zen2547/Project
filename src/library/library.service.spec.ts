import { NotFoundException } from '@nestjs/common';
import { LibraryService } from './library.service.js';
import { LibraryRepository, type Db } from './library.repository.js';
import type { MoviesRepository } from '../catalogue/movies/movies.repository.js';
import type { PrismaService } from '../prisma/prisma.service.js';

// A stand-in for PrismaService or a transaction client: just the one
// delegate markWatched uses, so we can see WHICH client did the write.
const fakeClient = () => ({
  watchedEntry: { createMany: vi.fn(async () => ({ count: 1 })) },
});

describe('markWatched (repository)', () => {
  it('without a transaction client: writes with the normal client', async () => {
    const prisma = fakeClient();
    const repo = new LibraryRepository(prisma as unknown as PrismaService);

    await repo.markWatched(7, 3);

    expect(prisma.watchedEntry.createMany).toHaveBeenCalledWith({
      data: [{ userId: 7, movieId: 3 }],
      skipDuplicates: true,
    });
  });

  it('with a transaction client: writes with THAT client only', async () => {
    const prisma = fakeClient();
    const tx = fakeClient();
    const repo = new LibraryRepository(prisma as unknown as PrismaService);

    await repo.markWatched(7, 3, tx as unknown as Db);

    expect(tx.watchedEntry.createMany).toHaveBeenCalledTimes(1);
    expect(prisma.watchedEntry.createMany).not.toHaveBeenCalled();
  });
});

describe('LibraryService', () => {
  let library: {
    addToWatchlist: ReturnType<typeof vi.fn>;
    markWatched: ReturnType<typeof vi.fn>;
    stateFor: ReturnType<typeof vi.fn>;
  };
  let movies: { exists: ReturnType<typeof vi.fn> };
  let service: LibraryService;

  beforeEach(() => {
    library = {
      addToWatchlist: vi.fn(),
      markWatched: vi.fn(),
      stateFor: vi.fn(),
    };
    movies = { exists: vi.fn(async () => true) };
    service = new LibraryService(
      library as unknown as LibraryRepository,
      movies as unknown as MoviesRepository,
    );
  });

  it('addToWatchlist: unknown Movie → 404, nothing written', async () => {
    movies.exists.mockResolvedValue(false);
    await expect(service.addToWatchlist(7, 99)).rejects.toThrow(
      NotFoundException,
    );
    expect(library.addToWatchlist).not.toHaveBeenCalled();
  });

  it('markWatched (for reviews) passes the transaction client through', async () => {
    const tx = {} as Db;
    await service.markWatched(7, 3, tx);
    expect(library.markWatched).toHaveBeenCalledWith(7, 3, tx);
  });

  it('stateFor: unknown Movie → 404', async () => {
    movies.exists.mockResolvedValue(false);
    await expect(service.stateFor(7, 99)).rejects.toThrow(NotFoundException);
  });
});
