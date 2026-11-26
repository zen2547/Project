import { ratingFromScores, toStoredRating } from './community-rating.js';

describe('Community Rating maths', () => {
  it('no Reviews → null average, count 0 (never 0.0)', () => {
    expect(ratingFromScores([])).toEqual({ ratingAvg: null, reviewCount: 0 });
  });

  it.each([
    [[8], 8],
    [[8, 5], 6.5],
    [[10, 9, 9], 9.3], // 9.333…
    [[10, 10, 9], 9.7], // 9.666…
    [[7, 8, 8, 6], 7.3], // 7.25 → half up
    [[1, 10], 5.5],
  ])('%j → %s', (scores, expected) => {
    expect(ratingFromScores(scores)).toEqual({
      ratingAvg: expected,
      reviewCount: scores.length,
    });
  });

  it('works from sum + count (what the database aggregate returns)', () => {
    // 143 / 20 = 7.15 → 7.2 (half up)
    expect(toStoredRating(143, 20)).toEqual({
      ratingAvg: 7.2,
      reviewCount: 20,
    });
  });
});
