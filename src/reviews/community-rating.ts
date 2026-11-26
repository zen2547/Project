// Community Rating maths, shared by ReviewsService and the seed so both
// always store exactly the same numbers.

export type StoredRating = { ratingAvg: number | null; reviewCount: number };

/**
 * From the sum and count of Scores to what Movie stores.
 *
 * Rounds to 1 decimal, half up (7.25 → 7.3), to fit Decimal(3, 1).
 * The database recomputes from the Reviews table, so this only ever sees
 * whole-number Scores.
 */
export function toStoredRating(sum: number, count: number): StoredRating {
  if (count === 0) return { ratingAvg: null, reviewCount: 0 };
  return {
    ratingAvg: Math.round((sum * 10) / count) / 10,
    reviewCount: count,
  };
}

export function ratingFromScores(scores: number[]): StoredRating {
  const sum = scores.reduce((total, score) => total + score, 0);
  return toStoredRating(sum, scores.length);
}
