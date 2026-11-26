import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { Prisma } from '../../prisma/generated/prisma/client.js';
import { isRecordNotFound } from '../../prisma/prisma-errors.js';
import type { CreateMovieDto, UpdateMovieDto } from './dto/movie.dto.js';

// What a Movie page needs from the database (grows with Credits, Trailers…).
const pageInclude = {
  genres: { orderBy: { name: 'asc' } },
  keywords: { orderBy: { name: 'asc' } },
} as const satisfies Prisma.MovieInclude;

export type MovieWithTaxonomy = Prisma.MovieGetPayload<{
  include: typeof pageInclude;
}>;

const toRefs = (ids: number[]) => ids.map((id) => ({ id }));

@Injectable()
export class MoviesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: number): Promise<MovieWithTaxonomy | null> {
    return this.prisma.movie.findUnique({
      where: { id },
      include: pageInclude,
    });
  }

  create({
    genreIds = [],
    keywordIds = [],
    ...fields
  }: CreateMovieDto): Promise<MovieWithTaxonomy> {
    return this.prisma.movie.create({
      data: {
        ...fields,
        genres: { connect: toRefs(genreIds) },
        keywords: { connect: toRefs(keywordIds) },
      },
      include: pageInclude,
    });
  }

  /** `set` replaces the whole list; a list left out is not touched. */
  async update(
    id: number,
    { genreIds, keywordIds, ...fields }: UpdateMovieDto,
  ): Promise<MovieWithTaxonomy | null> {
    try {
      return await this.prisma.movie.update({
        where: { id },
        data: {
          ...fields,
          ...(genreIds && { genres: { set: toRefs(genreIds) } }),
          ...(keywordIds && { keywords: { set: toRefs(keywordIds) } }),
        },
        include: pageInclude,
      });
    } catch (error) {
      if (isRecordNotFound(error)) return null;
      throw error;
    }
  }

  /** Returns `false` when there was no Movie with that id. */
  async delete(id: number): Promise<boolean> {
    try {
      await this.prisma.movie.delete({ where: { id } });
      return true;
    } catch (error) {
      if (isRecordNotFound(error)) return false;
      throw error;
    }
  }

  /** The ids in `ids` that have no Genre. */
  async missingGenreIds(ids: number[]): Promise<number[]> {
    if (ids.length === 0) return [];
    const found = await this.prisma.genre.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    return missing(ids, found);
  }

  /** The ids in `ids` that have no Keyword. */
  async missingKeywordIds(ids: number[]): Promise<number[]> {
    if (ids.length === 0) return [];
    const found = await this.prisma.keyword.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    return missing(ids, found);
  }
}

function missing(wanted: number[], found: { id: number }[]): number[] {
  const have = new Set(found.map((row) => row.id));
  return wanted.filter((id) => !have.has(id));
}
