import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { Prisma } from '../../prisma/generated/prisma/client.js';
import { isUniqueViolation } from '../../prisma/prisma-errors.js';
import type { CreateCreditDto, UpdateCreditDto } from './dto/credit.dto.js';

export const creditInclude = {
  person: { select: { id: true, name: true } },
} as const satisfies Prisma.CreditInclude;

// Billing order first; `id` keeps ties stable.
export const creditOrderBy: Prisma.CreditOrderByWithRelationInput[] = [
  { order: 'asc' },
  { id: 'asc' },
];

export type CreditWithPerson = Prisma.CreditGetPayload<{
  include: typeof creditInclude;
}>;

@Injectable()
export class CreditsRepository {
  constructor(private readonly prisma: PrismaService) {}

  listForMovie(movieId: number): Promise<CreditWithPerson[]> {
    return this.prisma.credit.findMany({
      where: { movieId },
      include: creditInclude,
      orderBy: creditOrderBy,
    });
  }

  /** `null` when the Credit doesn't exist or belongs to another Movie. */
  findOnMovie(
    movieId: number,
    creditId: number,
  ): Promise<CreditWithPerson | null> {
    return this.prisma.credit.findFirst({
      where: { id: creditId, movieId },
      include: creditInclude,
    });
  }

  /** 'duplicate' = this Person already has this role on this Movie. */
  async create(
    movieId: number,
    dto: CreateCreditDto,
  ): Promise<CreditWithPerson | 'duplicate'> {
    try {
      return await this.prisma.credit.create({
        data: { movieId, ...dto },
        include: creditInclude,
      });
    } catch (error) {
      if (isUniqueViolation(error)) return 'duplicate';
      throw error;
    }
  }

  update(creditId: number, dto: UpdateCreditDto): Promise<CreditWithPerson> {
    return this.prisma.credit.update({
      where: { id: creditId },
      data: dto,
      include: creditInclude,
    });
  }

  /** `false` when there was no such Credit on that Movie. */
  async deleteOnMovie(movieId: number, creditId: number): Promise<boolean> {
    const { count } = await this.prisma.credit.deleteMany({
      where: { id: creditId, movieId },
    });
    return count > 0;
  }
}
