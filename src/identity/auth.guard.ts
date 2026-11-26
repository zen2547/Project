import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { IS_PUBLIC } from './decorators/public.decorator.js';
import type { JwtPayload } from './auth-user.js';

// Registered globally (APP_GUARD in IdentityModule): runs before every route.
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const token = this.extractBearerToken(req);
    if (!token) {
      // 401, not 400: "you are not signed in" is an authentication problem.
      throw new UnauthorizedException('Missing bearer token');
    }

    let payload: JwtPayload;
    try {
      // Secret and expiry check come from JwtModule's config.
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const id = Number(payload.sub);
    if (!Number.isInteger(id) || id <= 0 || !payload.role) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    req.user = { id, role: payload.role };
    return true;
  }

  private extractBearerToken(req: Request): string | undefined {
    const [scheme, token] = req.headers.authorization?.split(' ') ?? [];
    return scheme === 'Bearer' && token ? token : undefined;
  }
}
