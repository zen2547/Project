import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MoviesRepository } from './movies.repository.js';
import { toMoviePage, type MoviePage } from './movie-page.js';
import type { CreateMovieDto, UpdateMovieDto } from './dto/movie.dto.js';

@Injectable()
export class MoviesService {
  constructor(private readonly movies: MoviesRepository) {}

  async getPage(id: number): Promise<MoviePage> {
    const movie = await this.movies.findById(id);
    if (!movie) throw notFound();
    return toMoviePage(movie);
  }

  async create(dto: CreateMovieDto): Promise<MoviePage> {
    await this.assertTaxonomyExists(dto);
    return toMoviePage(await this.movies.create(dto));
  }

  // A bad body is a 400 before we look for the Movie, the same order as the
  // validation pipe (which also runs before any lookup).
  async update(id: number, dto: UpdateMovieDto): Promise<MoviePage> {
    await this.assertTaxonomyExists(dto);
    const movie = await this.movies.update(id, dto);
    if (!movie) throw notFound();
    return toMoviePage(movie);
  }

  async delete(id: number): Promise<void> {
    if (!(await this.movies.delete(id))) throw notFound();
  }

  /** 400 naming every unknown id, so the Admin can fix them in one go. */
  private async assertTaxonomyExists(dto: {
    genreIds?: number[];
    keywordIds?: number[];
  }): Promise<void> {
    const [badGenres, badKeywords] = await Promise.all([
      this.movies.missingGenreIds(dto.genreIds ?? []),
      this.movies.missingKeywordIds(dto.keywordIds ?? []),
    ]);

    const problems: string[] = [];
    if (badGenres.length) {
      problems.push(`Unknown genreIds: ${badGenres.join(', ')}`);
    }
    if (badKeywords.length) {
      problems.push(`Unknown keywordIds: ${badKeywords.join(', ')}`);
    }
    if (problems.length) throw new BadRequestException(problems);
  }
}

const notFound = () => new NotFoundException('Movie not found');
