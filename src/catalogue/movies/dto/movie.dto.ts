import z from 'zod';
import { Certification } from '../../../prisma/generated/prisma/enums.js';
import { httpsUrlSchema } from '../../../common/https-url.schema.js';

// The first surviving film (Roundhay Garden Scene) is from 1888.
export const FIRST_FILM_YEAR = 1888;
// Computed per request, so the limit moves on by itself every new year.
export const maxReleaseYear = () => new Date().getFullYear() + 5;

const title = z.string().trim().min(1).max(200);
const releaseYear = z
  .number()
  .int()
  .min(FIRST_FILM_YEAR)
  .refine((year) => year <= maxReleaseYear(), {
    error: () => `releaseYear can be at most ${maxReleaseYear()}`,
  });
const certification = z.enum(Certification);
const runtimeMinutes = z.number().int().min(1).max(600);
const synopsis = z.string().trim().min(1).max(2000);

// Body ids must be real numbers (not "7"); duplicates are dropped.
const idList = z
  .array(z.number().int().positive())
  .max(20)
  .transform((ids) => [...new Set(ids)]);

// strictObject: unknown keys are a 400. That is how `ratingAvg` and
// `reviewCount` (owned by the reviews module) are kept out of the API.
export const createMovieSchema = z.strictObject({
  title,
  releaseYear,
  certification: certification.optional(),
  runtimeMinutes: runtimeMinutes.optional(),
  synopsis: synopsis.optional(),
  posterUrl: httpsUrlSchema.optional(),
  genreIds: idList.optional(),
  keywordIds: idList.optional(),
});
export type CreateMovieDto = z.infer<typeof createMovieSchema>;

// PATCH is partial: a missing field stays as it is, `null` clears an optional
// one, and `genreIds` / `keywordIds` replace the whole set when sent.
export const updateMovieSchema = z
  .strictObject({
    title: title.optional(),
    releaseYear: releaseYear.optional(),
    certification: certification.optional(),
    runtimeMinutes: runtimeMinutes.nullable().optional(),
    synopsis: synopsis.nullable().optional(),
    posterUrl: httpsUrlSchema.nullable().optional(),
    genreIds: idList.optional(),
    keywordIds: idList.optional(),
  })
  .refine((body) => Object.values(body).some((v) => v !== undefined), {
    error: 'Send at least one field to change',
  });
export type UpdateMovieDto = z.infer<typeof updateMovieSchema>;
