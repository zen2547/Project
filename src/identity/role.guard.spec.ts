import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleGuard } from './role.guard.js';
import type { AuthUser } from './auth-user.js';

function contextWith(user: AuthUser | undefined): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('RoleGuard', () => {
  let reflector: Reflector;
  let guard: RoleGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RoleGuard(reflector);
  });

  const requireRoles = (roles: string[] | undefined) =>
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles);

  it('lets anyone through a route without @Role', () => {
    requireRoles(undefined);
    expect(guard.canActivate(contextWith({ id: 1, role: 'MEMBER' }))).toBe(
      true,
    );
  });

  it('lets an Admin through an @Role("ADMIN") route', () => {
    requireRoles(['ADMIN']);
    expect(guard.canActivate(contextWith({ id: 1, role: 'ADMIN' }))).toBe(true);
  });

  it('rejects a Member on an @Role("ADMIN") route with 403', () => {
    requireRoles(['ADMIN']);
    expect(() =>
      guard.canActivate(contextWith({ id: 2, role: 'MEMBER' })),
    ).toThrow(ForbiddenException);
  });

  it('rejects a request with no user with 401', () => {
    requireRoles(['ADMIN']);
    expect(() => guard.canActivate(contextWith(undefined))).toThrow(
      UnauthorizedException,
    );
  });
});
