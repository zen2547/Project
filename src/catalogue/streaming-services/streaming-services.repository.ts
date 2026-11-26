import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { StreamingService } from '../../prisma/generated/prisma/client.js';
import {
  isRecordNotFound,
  isUniqueViolation,
} from '../../prisma/prisma-errors.js';

export type StreamingServiceData = {
  name?: string;
  logoUrl?: string | null;
};

// Same contract as GenresRepository:
// `null` = no row with that id; 'duplicate' = the name is taken.
@Injectable()
export class StreamingServicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(): Promise<StreamingService[]> {
    return this.prisma.streamingService.findMany({ orderBy: { name: 'asc' } });
  }

  async exists(id: number): Promise<boolean> {
    const row = await this.prisma.streamingService.findUnique({
      where: { id },
      select: { id: true },
    });
    return row !== null;
  }

  async create(data: {
    name: string;
    logoUrl?: string;
  }): Promise<StreamingService | 'duplicate'> {
    try {
      return await this.prisma.streamingService.create({ data });
    } catch (error) {
      if (isUniqueViolation(error)) return 'duplicate';
      throw error;
    }
  }

  async update(
    id: number,
    data: StreamingServiceData,
  ): Promise<StreamingService | null | 'duplicate'> {
    try {
      return await this.prisma.streamingService.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (isRecordNotFound(error)) return null;
      if (isUniqueViolation(error)) return 'duplicate';
      throw error;
    }
  }

  /** Returns `false` when there was no row with that id. */
  async delete(id: number): Promise<boolean> {
    try {
      await this.prisma.streamingService.delete({ where: { id } });
      return true;
    } catch (error) {
      if (isRecordNotFound(error)) return false;
      throw error;
    }
  }
}
