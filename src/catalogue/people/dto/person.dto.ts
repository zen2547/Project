import z from 'zod';
import { httpsUrlSchema } from '../../../common/https-url.schema.js';
import { paginationShape } from '../../../common/pagination.js';

const name = z.string().trim().min(1).max(120);
const bio = z.string().trim().min(1).max(2000);
// "YYYY-MM-DD" in, Date out (stored as a DATE column, no time zone).
const birthDate = z.iso
  .date()
  .transform((day) => new Date(`${day}T00:00:00Z`))
  .refine((date) => date <= new Date(), {
    error: 'birthDate cannot be in the future',
  });

export const createPersonSchema = z.strictObject({
  name,
  bio: bio.optional(),
  photoUrl: httpsUrlSchema.optional(),
  birthDate: birthDate.optional(),
});
export type CreatePersonDto = z.infer<typeof createPersonSchema>;

// Partial; `null` clears an optional field.
export const updatePersonSchema = z
  .strictObject({
    name: name.optional(),
    bio: bio.nullable().optional(),
    photoUrl: httpsUrlSchema.nullable().optional(),
    birthDate: birthDate.nullable().optional(),
  })
  .refine((body) => Object.values(body).some((v) => v !== undefined), {
    error: 'Send at least one field to change',
  });
export type UpdatePersonDto = z.infer<typeof updatePersonSchema>;

// GET /people?q=&page=&limit=
export const listPeopleSchema = z.object({
  q: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((q) => q || undefined),
  ...paginationShape,
});
export type ListPeopleQuery = z.infer<typeof listPeopleSchema>;
