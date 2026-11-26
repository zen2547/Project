import { Decimal } from '../../prisma/generated/prisma/internal/prismaNamespace.js';
import { toMoviePage } from './movie-page.js';
import type { MoviePageRow } from './movies.repository.js';

const base: MoviePageRow = {
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
  credits: [],
  trailers: [],
  photos: [],
  streamingLinks: [],
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

  it('splits Credits by role; stars = the first 3 CAST in billing order', () => {
    const credit = (
      id: number,
      role: 'DIRECTOR' | 'WRITER' | 'CAST',
      name: string,
      character: string | null = null,
    ) => ({
      id,
      movieId: 1,
      personId: id,
      role,
      character,
      order: id,
      person: { id, name },
    });

    // Already in billing order, as the repository returns them.
    const page = toMoviePage({
      ...base,
      credits: [
        credit(1, 'DIRECTOR', 'Bong Joon Ho'),
        credit(2, 'WRITER', 'Bong Joon Ho'),
        credit(3, 'CAST', 'Song Kang-ho', 'Ki-taek'),
        credit(4, 'CAST', 'Lee Sun-kyun', 'Dong-ik'),
        credit(5, 'CAST', 'Cho Yeo-jeong', 'Yeon-kyo'),
        credit(6, 'CAST', 'Choi Woo-shik', 'Ki-woo'),
      ],
    });

    expect(page.directors).toEqual([{ personId: 1, name: 'Bong Joon Ho' }]);
    expect(page.writers).toEqual([{ personId: 2, name: 'Bong Joon Ho' }]);
    expect(page.stars).toEqual([
      { personId: 3, name: 'Song Kang-ho', character: 'Ki-taek' },
      { personId: 4, name: 'Lee Sun-kyun', character: 'Dong-ik' },
      { personId: 5, name: 'Cho Yeo-jeong', character: 'Yeon-kyo' },
    ]);
  });

  it('never exposes the raw rating columns or timestamps', () => {
    const page = toMoviePage(base);
    for (const key of ['ratingAvg', 'reviewCount', 'createdAt', 'updatedAt']) {
      expect(page).not.toHaveProperty(key);
    }
  });
});
