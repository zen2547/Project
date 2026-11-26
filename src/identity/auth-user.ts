import type { Role } from '../prisma/generated/prisma/client.js';

// What the JWT carries. `sub` is a string because the JWT standard says so.
export type JwtPayload = {
  sub: string;
  role: Role;
};

// What AuthGuard puts on `req.user` for every signed-in request.
export type AuthUser = {
  id: number;
  role: Role;
};
