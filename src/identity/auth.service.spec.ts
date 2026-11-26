import { ConflictException, UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import type { UserRepository } from './user.repository.js';
import type { PasswordHasher } from './password-hasher.service.js';
import type { User } from '../prisma/generated/prisma/client.js';

const savedUser: User = {
  id: 1,
  email: 'palm@example.com',
  passwordHash: 'hashed:secret123',
  displayName: 'Palm',
  role: 'MEMBER',
  createdAt: new Date('2026-11-26T00:00:00Z'),
};

describe('AuthService', () => {
  let users: {
    create: ReturnType<typeof vi.fn>;
    findByEmail: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
  };
  let hasher: {
    hash: ReturnType<typeof vi.fn>;
    verify: ReturnType<typeof vi.fn>;
  };
  let jwt: { signAsync: ReturnType<typeof vi.fn> };
  let service: AuthService;

  beforeEach(() => {
    users = { create: vi.fn(), findByEmail: vi.fn(), findById: vi.fn() };
    hasher = {
      hash: vi.fn(async (plain: string) => `hashed:${plain}`),
      verify: vi.fn(
        async (plain: string, hash: string) => hash === `hashed:${plain}`,
      ),
    };
    jwt = { signAsync: vi.fn(async () => 'signed.jwt.token') };
    service = new AuthService(
      users as unknown as UserRepository,
      hasher as unknown as PasswordHasher,
      jwt as unknown as JwtService,
    );
  });

  describe('register', () => {
    const dto = {
      email: 'palm@example.com',
      password: 'secret123',
      displayName: 'Palm',
    };

    it('stores the hash, never the plain password', async () => {
      users.create.mockResolvedValue(savedUser);

      await service.register(dto);

      expect(hasher.hash).toHaveBeenCalledWith('secret123');
      expect(users.create).toHaveBeenCalledWith({
        email: 'palm@example.com',
        passwordHash: 'hashed:secret123',
        displayName: 'Palm',
      });
    });

    it('returns the public profile without passwordHash', async () => {
      users.create.mockResolvedValue(savedUser);

      const result = await service.register(dto);

      expect(result).toEqual({
        id: 1,
        email: 'palm@example.com',
        displayName: 'Palm',
        role: 'MEMBER',
      });
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('throws 409 when the repository reports the email is taken', async () => {
      users.create.mockResolvedValue(null);

      await expect(service.register(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    it('signs a token carrying the user id (as a string) and role', async () => {
      users.findByEmail.mockResolvedValue(savedUser);

      const result = await service.login({
        email: 'palm@example.com',
        password: 'secret123',
      });

      expect(result).toEqual({ accessToken: 'signed.jwt.token' });
      expect(jwt.signAsync).toHaveBeenCalledWith({ sub: '1', role: 'MEMBER' });
    });

    it('gives the same error for an unknown email and a wrong password', async () => {
      users.findByEmail.mockResolvedValueOnce(null);
      const unknownEmail = service
        .login({ email: 'nobody@example.com', password: 'secret123' })
        .catch((e: unknown) => e);

      users.findByEmail.mockResolvedValueOnce(savedUser);
      const wrongPassword = service
        .login({ email: 'palm@example.com', password: 'wrong-pass' })
        .catch((e: unknown) => e);

      const [a, b] = await Promise.all([unknownEmail, wrongPassword]);
      expect(a).toBeInstanceOf(UnauthorizedException);
      expect(b).toBeInstanceOf(UnauthorizedException);
      expect((a as Error).message).toBe((b as Error).message);
      expect(jwt.signAsync).not.toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('returns the profile with createdAt and without passwordHash', async () => {
      users.findById.mockResolvedValue(savedUser);

      const profile = await service.getProfile(1);

      expect(profile).toEqual({
        id: 1,
        email: 'palm@example.com',
        displayName: 'Palm',
        role: 'MEMBER',
        createdAt: savedUser.createdAt,
      });
    });

    it('throws 401 when the account was deleted after the token was issued', async () => {
      users.findById.mockResolvedValue(null);

      await expect(service.getProfile(1)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});
