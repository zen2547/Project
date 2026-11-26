import z from 'zod';

// Shared by every list endpoint (see "API conventions" in CAPABILITY-MAP.md):
// ?page=1&limit=20 (limit max 50) → { data: [...], meta: { page, limit, total } }

export const MAX_PAGE_SIZE = 50;

// Spread into a query schema: z.object({ ...paginationShape, q: ... })
// Query strings are always text, so the numbers are coerced.
export const paginationShape = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(20),
};

export type PageQuery = { page: number; limit: number };

export type Page<T> = {
  data: T[];
  meta: { page: number; limit: number; total: number };
};

/** Prisma `skip` / `take` for a page. */
export const skipTake = ({ page, limit }: PageQuery) => ({
  skip: (page - 1) * limit,
  take: limit,
});

export const toPage = <T>(
  data: T[],
  total: number,
  { page, limit }: PageQuery,
): Page<T> => ({ data, meta: { page, limit, total } });
