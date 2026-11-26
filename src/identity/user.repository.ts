import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { User } from '../prisma/generated/prisma/client.js';
import { PrismaClientKnownRequestError } from '../prisma/generated/prisma/internal/prismaNamespace.js';

export type CreateUserData = {
  email: string;
  passwordHash: string;
  displayName: string;
};

// Prisma error code for "unique constraint failed".
const UNIQUE_VIOLATION = 'P2002';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  /** Returns `null` when the email is already taken. */
  async create(data: CreateUserData): Promise<User | null> {
    try {
      return await this.prisma.user.create({ data });
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === UNIQUE_VIOLATION
      ) {
        return null;
      }
      throw error;
    }
  }
}
