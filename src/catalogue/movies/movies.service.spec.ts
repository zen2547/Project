import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MoviesService } from './movies.service.js';
import type {
  MoviesRepository,
  MovieWithTaxonomy,
} from './movies.repository.js';

const inception: MovieWithTaxonomy = {
  id: 1,
  title: 'Inception',
  releaseYear: 2010,
  certification: 'PG_13',
  runtimeMinutes: 148,
  synopsis: null,
  posterUrl: null,
  ratingAvg: null,
  reviewCount: 0,
  createdAt: new Date('2026-11-26T00:00:00Z'),
  updatedAt: new Date('2026-11-26T00:00:00Z'),
  genres: [{ id: 3, name: 'Sci-Fi' }],
  keywords: [],
};

describe('MoviesService', () => {
  let repo: {
    findById: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    missingGenreIds: ReturnType<typeof vi.fn>;
    missingKeywordIds: ReturnType<typeof vi.fn>;
  };
  let service: MoviesService;

  beforeEach(() => {
    repo = {
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      missingGenreIds: vi.fn(async () => []),
      missingKeywordIds: vi.fn(async () => []),
    };
    service = new MoviesService(repo as unknown as MoviesRepository);
  });

  it('create: unknown genre and keyword ids → 400 naming all of them, nothing saved', async () => {
    repo.missingGenreIds.mockResolvedValue([98, 99]);
    repo.missingKeywordIds.mockResolvedValue([7]);

    const error = await service
      .create({
        title: 'X',
        releaseYear: 2000,
        genreIds: [3, 98, 99],
        keywordIds: [7],
      })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toMatchObject({
      message: ['Unknown genreIds: 98, 99', 'Unknown keywordIds: 7'],
    });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('create returns the Movie page', async () => {
    repo.create.mockResolvedValue(inception);

    const page = await service.create({
      title: 'Inception',
      releaseYear: 2010,
    });

    expect(page).toMatchObject({
      id: 1,
      title: 'Inception',
      genres: [{ id: 3, name: 'Sci-Fi' }],
      communityRating: null,
    });
    expect(page).not.toHaveProperty('ratingAvg');
  });

  it('getPage: unknown id → 404', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.getPage(99)).rejects.toThrow(NotFoundException);
  });

  it('update: unknown id → 404', async () => {
    repo.update.mockResolvedValue(null);
    await expect(service.update(99, { title: 'X' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('update: checks taxonomy ids before touching the Movie', async () => {
    repo.missingGenreIds.mockResolvedValue([42]);
    await expect(service.update(1, { genreIds: [42] })).rejects.toThrow(
      BadRequestException,
    );
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('delete: unknown id → 404', async () => {
    repo.delete.mockResolvedValue(false);
    await expect(service.delete(99)).rejects.toThrow(NotFoundException);
  });
});
