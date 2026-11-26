import { SetMetadata } from '@nestjs/common';
import type { Role as UserRole } from '../../prisma/generated/prisma/client.js';

export const ROLES = 'roles';

// @Role('ADMIN') on a handler or controller: only those roles may call it.
// Without @Role, any signed-in Member may (AuthGuard still applies).
export const Role = (...roles: [UserRole, ...UserRole[]]) =>
  SetMetadata(ROLES, roles);
