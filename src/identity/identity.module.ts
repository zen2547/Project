import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthGuard } from './auth.guard.js';
import { RoleGuard } from './role.guard.js';
import { UserRepository } from './user.repository.js';
import { PasswordHasher } from './password-hasher.service.js';
import type { Env } from '../config/env.schema.js';

@Module({
  imports: [
    // Secret + lifetime configured once here, so sign/verify calls don't repeat them.
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: {
          expiresIn: config.get('JWT_EXPIRES_IN', { infer: true }),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    UserRepository,
    PasswordHasher,
    // Global guards run in this order: who are you (AuthGuard), then
    // are you allowed (RoleGuard). Every route needs a JWT unless @Public().
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RoleGuard },
  ],
  exports: [UserRepository],
})
export class IdentityModule {}
