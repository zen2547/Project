import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { Person, Prisma } from '../../prisma/generated/prisma/client.js';
import {
  isForeignKeyViolation,
  isRecordNotFound,
} from '../../prisma/prisma-errors.js';
import { skipTake } from '../../common/pagination.js';
import type {
  CreatePersonDto,
  ListPeopleQuery,
  UpdatePersonDto,
} from './dto/person.dto.js';

// A Person's page: every Credit with the Movie it is on, newest Movie first.
// `satisfies` (no `as const`): an `as const` array is readonly, which
// Prisma's `orderBy` type does not accept.
const filmographyInclude = {
  credits: {
    include: {
      movie: {
        select: { id: true, title: true, releaseYear: true, posterUrl: true },
      },
    },
    orderBy: [{ movie: { releaseYear: 'desc' } }, { id: 'asc' }],
  },
} satisfies Prisma.PersonInclude;

export type PersonWithFilmography = Prisma.PersonGetPayload<{
  include: typeof filmographyInclude;
}>;

export type DeletePersonResult = 'deleted' | 'not-found' | 'has-credits';

@Injectable()
export class PeopleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    query: ListPeopleQuery,
  ): Promise<{ rows: Person[]; total: number }> {
    const where: Prisma.PersonWhereInput = query.q
      ? { name: { contains: query.q, mode: 'insensitive' } }
      : {};
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.person.findMany({
        where,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        ...skipTake(query),
      }),
      this.prisma.person.count({ where }),
    ]);
    return { rows, total };
  }

  findWithFilmography(id: number): Promise<PersonWithFilmography | null> {
    return this.prisma.person.findUnique({
      where: { id },
      include: filmographyInclude,
    });
  }

  async exists(id: number): Promise<boolean> {
    const person = await this.prisma.person.findUnique({
      where: { id },
      select: { id: true },
    });
    return person !== null;
  }

  create(data: CreatePersonDto): Promise<Person> {
    return this.prisma.person.create({ data });
  }

  async update(id: number, data: UpdatePersonDto): Promise<Person | null> {
    try {
      return await this.prisma.person.update({ where: { id }, data });
    } catch (error) {
      if (isRecordNotFound(error)) return null;
      throw error;
    }
  }

  // The database refuses (onDelete: Restrict) while Credits point at the
  // Person, so there is no "check, then delete" race.
  async delete(id: number): Promise<DeletePersonResult> {
    try {
      await this.prisma.person.delete({ where: { id } });
      return 'deleted';
    } catch (error) {
      if (isRecordNotFound(error)) return 'not-found';
      if (isForeignKeyViolation(error)) return 'has-credits';
      throw error;
    }
  }
}
