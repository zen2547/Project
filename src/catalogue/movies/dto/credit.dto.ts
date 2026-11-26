import z from 'zod';
import { CreditRole } from '../../../prisma/generated/prisma/enums.js';

export const CHARACTER_ONLY_ON_CAST =
  'character is only allowed on CAST credits';

const character = z.string().trim().min(1).max(120);
// Billing order: lowest first. The top 3 CAST are the Movie page's "stars".
const order = z.number().int().min(0).max(999);

export const createCreditSchema = z
  .strictObject({
    personId: z.number().int().positive(),
    role: z.enum(CreditRole),
    character: character.optional(),
    order: order.optional(),
  })
  .refine((c) => c.role === 'CAST' || c.character === undefined, {
    error: CHARACTER_ONLY_ON_CAST,
    path: ['character'],
  });
export type CreateCreditDto = z.infer<typeof createCreditSchema>;

// Person and role are the Credit's identity: to change them, delete and
// re-add. `character: null` clears it.
export const updateCreditSchema = z
  .strictObject({
    character: character.nullable().optional(),
    order: order.optional(),
  })
  .refine((body) => Object.values(body).some((v) => v !== undefined), {
    error: 'Send at least one of: character, order',
  });
export type UpdateCreditDto = z.infer<typeof updateCreditSchema>;
