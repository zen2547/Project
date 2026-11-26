import z from 'zod';
import { paginationShape } from '../../common/pagination.js';

export const MIN_SCORE = 1;
export const MAX_SCORE = 10;

// PUT replaces the whole Review, so a missing comment means "no comment".
// "" and "   " are stored as null.
export const putReviewSchema = z.strictObject({
  score: z.number().int().min(MIN_SCORE).max(MAX_SCORE),
  comment: z
    .string()
    .trim()
    .max(2000)
    .nullable()
    .optional()
    .transform((comment) => comment || null),
});
export type PutReviewDto = z.infer<typeof putReviewSchema>;

export const reviewPageSchema = z.object(paginationShape);
