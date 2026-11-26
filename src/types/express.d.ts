import type { AuthUser } from '../identity/auth-user.js';

// Teach TypeScript that AuthGuard adds `user` to the Express request.
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
