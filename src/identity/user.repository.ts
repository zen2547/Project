import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { User } from '../prisma/generated/prisma/client.js';
import { isUniqueViolation } from '../prisma/prisma-errors.js';

export type CreateUserData = {
  email: string;
  passwordHash: string;
  displayName: string;
};

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
      if (isUniqueViolation(error)) return null;
      throw error;
    }
  }
}
