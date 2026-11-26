import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { Prisma } from '../../prisma/generated/prisma/client.js';
import { isRecordNotFound } from '../../prisma/prisma-errors.js';
import { skipTake } from '../../common/pagination.js';
import type { CreateMovieDto, UpdateMovieDto } from './dto/movie.dto.js';
import type { ListMoviesQuery } from './dto/list-movies.dto.js';
import { creditInclude, creditOrderBy } from './credits.repository.js';

// Everything a Movie page needs, fetched in ONE query (SPEC-catalogue.md).
const pageInclude = {
  genres: { orderBy: { name: 'asc' } },
  keywords: { orderBy: { name: 'asc' } },
  credits: { include: creditInclude, orderBy: creditOrderBy },
  trailers: { orderBy: { id: 'asc' } },
  photos: { orderBy: { id: 'asc' } },
  streamingLinks: {
    include: { service: true },
    orderBy: { service: { name: 'asc' } },
  },
} as const satisfies Prisma.MovieInclude;

export type MoviePageRow = Prisma.MovieGetPayload<{
  include: typeof pageInclude;
}>;

// What one row of GET /movies needs.
const listSelect = {
  id: true,
  title: true,
  releaseYear: true,
  certification: true,
  runtimeMinutes: true,
  posterUrl: true,
  ratingAvg: true,
  reviewCount: true,
} as const satisfies Prisma.MovieSelect;

export type MovieListRow = Prisma.MovieGetPayload<{
  select: typeof listSelect;
}>;

const toRefs = (ids: number[]) => ids.map((id) => ({ id }));

@Injectable()
export class MoviesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** One page of Movies plus the total that match the filters. */
  async list(
    query: ListMoviesQuery,
  ): Promise<{ rows: MovieListRow[]; total: number }> {
    const where: Prisma.MovieWhereInput = {
      ...(query.q && { title: { contains: query.q, mode: 'insensitive' } }),
      ...(query.genreId && { genres: { some: { id: query.genreId } } }),
      ...(query.keywordId && { keywords: { some: { id: query.keywordId } } }),
      ...(query.year && { releaseYear: query.year }),
    };

    // count and findMany in one transaction, so `total` matches the page.
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.movie.findMany({
        where,
        select: listSelect,
        orderBy: orderByFor(query),
        ...skipTake(query),
      }),
      this.prisma.movie.count({ where }),
    ]);
    return { rows, total };
  }

  async exists(id: number): Promise<boolean> {
    const movie = await this.prisma.movie.findUnique({
      where: { id },
      select: { id: true },
    });
    return movie !== null;
  }

  findById(id: number): Promise<MoviePageRow | null> {
    return this.prisma.movie.findUnique({
      where: { id },
      include: pageInclude,
    });
  }

  create({
    genreIds = [],
    keywordIds = [],
    ...fields
  }: CreateMovieDto): Promise<MoviePageRow> {
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
  ): Promise<MoviePageRow | null> {
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

// Always end with `id` so rows with the same rating/year keep a fixed order
// and never jump between pages.
function orderByFor({
  sort,
  order,
}: ListMoviesQuery): Prisma.MovieOrderByWithRelationInput[] {
  switch (sort) {
    case 'rating':
      // Movies without Reviews (ratingAvg null) go last for asc AND desc.
      return [{ ratingAvg: { sort: order, nulls: 'last' } }, { id: 'asc' }];
    case 'year':
      return [{ releaseYear: order }, { id: 'asc' }];
    case 'newest':
      return [{ createdAt: order }, { id: order }];
  }
}

function missing(wanted: number[], found: { id: number }[]): number[] {
  const have = new Set(found.map((row) => row.id));
  return wanted.filter((id) => !have.has(id));
}
