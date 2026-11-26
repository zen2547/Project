import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRepository } from './user.repository.js';
import { PasswordHasher } from './password-hasher.service.js';
import { PublicUser, toPublicUser } from './user.types.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { JwtPayload } from './auth-user.js';

// One message for "no such email" and "wrong password", so the API never
// reveals which emails are registered.
const INVALID_CREDENTIALS = 'Invalid email or password';

export type Profile = PublicUser & { createdAt: Date };

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<PublicUser> {
    const passwordHash = await this.hasher.hash(dto.password);

    // No "check then insert": the unique index on email is the single source of
    // truth, so two simultaneous sign-ups with one email can't both succeed.
    const user = await this.users.create({
      email: dto.email,
      passwordHash,
      displayName: dto.displayName,
    });
    if (!user) {
      throw new ConflictException('Email already in use');
    }

    // Role is never taken from the request: the DB default makes every sign-up a MEMBER.
    return toPublicUser(user);
  }

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const user = await this.users.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const matches = await this.hasher.verify(dto.password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const payload: JwtPayload = { sub: String(user.id), role: user.role };
    return { accessToken: await this.jwt.signAsync(payload) };
  }

  async getProfile(userId: number): Promise<Profile> {
    const user = await this.users.findById(userId);
    // A valid token for a deleted account is no longer a valid session.
    if (!user) {
      throw new UnauthorizedException('Account no longer exists');
    }
    return { ...toPublicUser(user), createdAt: user.createdAt };
  }
}
