import * as argon2 from 'argon2';
import type { PrismaClient } from '../../src/prisma/generated/prisma/client.js';
import { toStoredRating } from '../../src/reviews/community-rating.js';
import {
  SEED_MEMBERS,
  SEED_MEMBER_PASSWORD,
  SEED_REVIEWS,
} from '../seed-data/reviews.js';

export type ReviewSeedResult = { members: number; reviews: number };

/**
 * Upsert the seed Members, replace THEIR Reviews with SEED_REVIEWS, mark
 * those Movies Watched for them, and recompute every Movie's Community
 * Rating with the same function the API uses. Run after seedCatalogue.
 * Re-runnable; other Members' Reviews are left alone (and counted).
 */
export async function seedMembersAndReviews(
  prisma: PrismaClient,
): Promise<ReviewSeedResult> {
  const passwordHash = await argon2.hash(SEED_MEMBER_PASSWORD);
  const userId = new Map<string, number>();
  for (const { email, displayName } of SEED_MEMBERS) {
    const user = await prisma.user.upsert({
      where: { email },
      create: { email, displayName, passwordHash, role: 'MEMBER' },
      update: { displayName, passwordHash, role: 'MEMBER' },
    });
    userId.set(displayName, user.id);
  }
  const memberIds = [...userId.values()];

  await prisma.$transaction(
    async (tx) => {
      const movies = await tx.movie.findMany({
        select: { id: true, title: true },
      });
      const movieId = new Map(movies.map((m) => [m.title, m.id]));
      const idOf = (map: Map<string, number>, key: string) => {
        const id = map.get(key);
        if (id === undefined) {
          throw new Error(`Seed: "${key}" not found (run seedCatalogue first)`);
        }
        return id;
      };

      const rows = SEED_REVIEWS.map((r) => ({
        userId: idOf(userId, r.by),
        movieId: idOf(movieId, r.movie),
        score: r.score,
        comment: r.comment?.trim() || null, // same rule as the API
      }));

      await tx.review.deleteMany({ where: { userId: { in: memberIds } } });
      await tx.review.createMany({ data: rows });
      // Posting a Review marks the Movie Watched (SPEC-reviews.md).
      await tx.watchedEntry.createMany({
        data: rows.map(({ userId, movieId }) => ({ userId, movieId })),
        skipDuplicates: true,
      });

      // Recompute every Movie, so ones that lost all Reviews go back to null.
      const totals = await tx.review.groupBy({
        by: ['movieId'],
        _sum: { score: true },
        _count: { _all: true },
      });
      const byMovie = new Map(totals.map((t) => [t.movieId, t]));
      for (const { id } of movies) {
        const t = byMovie.get(id);
        await tx.movie.update({
          where: { id },
          data: toStoredRating(t?._sum.score ?? 0, t?._count._all ?? 0),
        });
      }
    },
    { timeout: 30_000 },
  );

  return { members: SEED_MEMBERS.length, reviews: SEED_REVIEWS.length };
}
