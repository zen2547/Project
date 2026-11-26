import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from '../auth-user.js';

// @CurrentUser() user: AuthUser   → { id, role }
// @CurrentUser('id') id: number   → just the id
export const CurrentUser = createParamDecorator(
  (field: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const user = ctx.switchToHttp().getRequest<Request>().user;
    // Only reachable if someone puts @CurrentUser() on a @Public() route.
    if (!user) {
      throw new InternalServerErrorException(
        '@CurrentUser() used on a route without authentication',
      );
    }
    return field ? user[field] : user;
  },
);
