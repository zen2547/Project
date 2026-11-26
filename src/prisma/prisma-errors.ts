import { PrismaClientKnownRequestError } from './generated/prisma/internal/prismaNamespace.js';

// Prisma error codes we turn into normal results instead of 500s.
// https://www.prisma.io/docs/orm/reference/error-reference

/** A `@unique` column already has this value. */
export const isUniqueViolation = (error: unknown): boolean =>
  error instanceof PrismaClientKnownRequestError && error.code === 'P2002';

/** `update`/`delete` found no row with that id. */
export const isRecordNotFound = (error: unknown): boolean =>
  error instanceof PrismaClientKnownRequestError && error.code === 'P2025';
