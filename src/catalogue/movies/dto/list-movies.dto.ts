import z from 'zod';
import { paginationShape } from '../../../common/pagination.js';

const queryId = z.coerce.number().int().positive();

// GET /movies?q=&genreId=&keywordId=&year=&sort=&order=&page=&limit=
export const listMoviesSchema = z.object({
  // `?q=` or `?q=%20` means "no search", not "match nothing".
  q: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((q) => q || undefined),
  genreId: queryId.optional(),
  keywordId: queryId.optional(),
  year: z.coerce.number().int().min(1888).max(9999).optional(),
  // newest = most recently added to the catalogue (createdAt).
  sort: z.enum(['rating', 'year', 'newest']).default('newest'),
  order: z.enum(['asc', 'desc']).default('desc'),
  ...paginationShape,
});

export type ListMoviesQuery = z.infer<typeof listMoviesSchema>;
