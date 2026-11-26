import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { Genre } from '../../prisma/generated/prisma/client.js';
import {
  isRecordNotFound,
  isUniqueViolation,
} from '../../prisma/prisma-errors.js';

// `null` = no Genre with that id; 'duplicate' = the name is taken.
export type GenreWriteResult = Genre | null | 'duplicate';

@Injectable()
export class GenresRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(): Promise<Genre[]> {
    return this.prisma.genre.findMany({ orderBy: { name: 'asc' } });
  }

  // Let the unique index decide (no "check then insert" race).
  async create(name: string): Promise<Genre | 'duplicate'> {
    try {
      return await this.prisma.genre.create({ data: { name } });
    } catch (error) {
      if (isUniqueViolation(error)) return 'duplicate';
      throw error;
    }
  }

  async rename(id: number, name: string): Promise<GenreWriteResult> {
    try {
      return await this.prisma.genre.update({ where: { id }, data: { name } });
    } catch (error) {
      if (isRecordNotFound(error)) return null;
      if (isUniqueViolation(error)) return 'duplicate';
      throw error;
    }
  }

  /** Returns `false` when there was no Genre with that id. */
  async delete(id: number): Promise<boolean> {
    try {
      await this.prisma.genre.delete({ where: { id } });
      return true;
    } catch (error) {
      if (isRecordNotFound(error)) return false;
      throw error;
    }
  }
}
