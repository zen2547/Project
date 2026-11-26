import type { CreditRole } from '../../prisma/generated/prisma/client.js';
import type { CreditWithPerson } from './credits.repository.js';

// One Credit as the API shows it.
export type CreditView = {
  creditId: number;
  personId: number;
  name: string;
  role: CreditRole;
  character: string | null;
  order: number;
};

export const toCreditView = (c: CreditWithPerson): CreditView => ({
  creditId: c.id,
  personId: c.person.id,
  name: c.person.name,
  role: c.role,
  character: c.character,
  order: c.order,
});

// GET /movies/:id/credits — full cast & crew. Input must already be in
// billing order (see creditOrderBy).
export function groupCredits(credits: CreditWithPerson[]) {
  const views = credits.map(toCreditView);
  return {
    directors: views.filter((c) => c.role === 'DIRECTOR'),
    writers: views.filter((c) => c.role === 'WRITER'),
    cast: views.filter((c) => c.role === 'CAST'),
  };
}
