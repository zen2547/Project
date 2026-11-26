import { Decimal } from '../../prisma/generated/prisma/internal/prismaNamespace.js';
import { toMoviePage } from './movie-page.js';
import type { MovieWithTaxonomy } from './movies.repository.js';

const base: MovieWithTaxonomy = {
  id: 1,
  title: 'Parasite',
  releaseYear: 2019,
  certification: 'R',
  runtimeMinutes: 132,
  synopsis: null,
  posterUrl: null,
  ratingAvg: null,
  reviewCount: 0,
  createdAt: new Date('2026-11-26T00:00:00Z'),
  updatedAt: new Date('2026-11-26T00:00:00Z'),
  genres: [],
  keywords: [],
};

describe('toMoviePage', () => {
  it('communityRating is null when there are no Reviews', () => {
    expect(toMoviePage(base).communityRating).toBeNull();
  });

  it('communityRating turns the Decimal average into a number', () => {
    const page = toMoviePage({
      ...base,
      ratingAvg: new Decimal('8.7'),
      reviewCount: 5,
    });
    expect(page.communityRating).toEqual({ average: 8.7, count: 5 });
  });

  it('never exposes the raw rating columns or timestamps', () => {
    const page = toMoviePage(base);
    for (const key of ['ratingAvg', 'reviewCount', 'createdAt', 'updatedAt']) {
      expect(page).not.toHaveProperty(key);
    }
  });
});
