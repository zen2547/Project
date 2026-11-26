import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES } from './decorators/role.decorator.js';
import type { Role as UserRole } from '../prisma/generated/prisma/client.js';

// Registered globally right after AuthGuard, so `req.user` is already set
// (or the route is @Public). Fixes dnc03's RoleGuard, which always returned true.
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowed = this.reflector.getAllAndOverride<UserRole[] | undefined>(
      ROLES,
      [context.getHandler(), context.getClass()],
    );
    if (!allowed || allowed.length === 0) return true;

    const user = context.switchToHttp().getRequest<Request>().user;
    // Only possible if a route is both @Public() and @Role(): treat as signed out.
    if (!user) {
      throw new UnauthorizedException('Missing bearer token');
    }
    // 403, not 401: we know who you are, you just aren't allowed.
    if (!allowed.includes(user.role)) {
      throw new ForbiddenException('You do not have permission to do this');
    }
    return true;
  }
}
