import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { Keyword } from '../../prisma/generated/prisma/client.js';
import {
  isRecordNotFound,
  isUniqueViolation,
} from '../../prisma/prisma-errors.js';

// `null` = no Keyword with that id; 'duplicate' = the name is taken.
export type KeywordWriteResult = Keyword | null | 'duplicate';

@Injectable()
export class KeywordsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(): Promise<Keyword[]> {
    return this.prisma.keyword.findMany({ orderBy: { name: 'asc' } });
  }

  // Let the unique index decide (no "check then insert" race).
  async create(name: string): Promise<Keyword | 'duplicate'> {
    try {
      return await this.prisma.keyword.create({ data: { name } });
    } catch (error) {
      if (isUniqueViolation(error)) return 'duplicate';
      throw error;
    }
  }

  async rename(id: number, name: string): Promise<KeywordWriteResult> {
    try {
      return await this.prisma.keyword.update({
        where: { id },
        data: { name },
      });
    } catch (error) {
      if (isRecordNotFound(error)) return null;
      if (isUniqueViolation(error)) return 'duplicate';
      throw error;
    }
  }

  /** Returns `false` when there was no Keyword with that id. */
  async delete(id: number): Promise<boolean> {
    try {
      await this.prisma.keyword.delete({ where: { id } });
      return true;
    } catch (error) {
      if (isRecordNotFound(error)) return false;
      throw error;
    }
  }
}
