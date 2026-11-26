import { PrismaClientKnownRequestError } from './generated/prisma/internal/prismaNamespace.js';

// Prisma error codes we turn into normal results instead of 500s.
// https://www.prisma.io/docs/orm/reference/error-reference

/** A `@unique` column already has this value. */
export const isUniqueViolation = (error: unknown): boolean =>
  error instanceof PrismaClientKnownRequestError && error.code === 'P2002';

/** `update`/`delete` found no row with that id. */
export const isRecordNotFound = (error: unknown): boolean =>
  error instanceof PrismaClientKnownRequestError && error.code === 'P2025';

/**
 * A foreign key blocked the write, e.g. deleting a row that others still
 * point at with `onDelete: Restrict`. Postgres reports P2003; Prisma's own
 * relation check reports P2014.
 */
export const isForeignKeyViolation = (error: unknown): boolean =>
  error instanceof PrismaClientKnownRequestError &&
  (error.code === 'P2003' || error.code === 'P2014');
