import type { User } from '../prisma/generated/prisma/client.js';

// What the API may reveal about a user to that same user.
// passwordHash never leaves the server.
export type PublicUser = Pick<User, 'id' | 'email' | 'displayName' | 'role'>;

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  };
}
