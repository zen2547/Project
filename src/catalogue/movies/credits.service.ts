import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MoviesRepository } from './movies.repository.js';
import { PeopleRepository } from '../people/people.repository.js';
import { CreditsRepository } from './credits.repository.js';
import { groupCredits, toCreditView, type CreditView } from './credit-view.js';
import {
  CHARACTER_ONLY_ON_CAST,
  type CreateCreditDto,
  type UpdateCreditDto,
} from './dto/credit.dto.js';

@Injectable()
export class CreditsService {
  constructor(
    private readonly credits: CreditsRepository,
    private readonly movies: MoviesRepository,
    private readonly people: PeopleRepository,
  ) {}

  async list(movieId: number) {
    await this.assertMovieExists(movieId);
    return groupCredits(await this.credits.listForMovie(movieId));
  }

  // The Movie is in the URL (404 if missing); the Person is in the body
  // (400 if missing), like unknown genreIds on a Movie.
  async create(movieId: number, dto: CreateCreditDto): Promise<CreditView> {
    await this.assertMovieExists(movieId);
    if (!(await this.people.exists(dto.personId))) {
      throw new BadRequestException(`Unknown personId: ${dto.personId}`);
    }

    const credit = await this.credits.create(movieId, dto);
    if (credit === 'duplicate') {
      throw new ConflictException(
        'This Person already has that role on this Movie',
      );
    }
    return toCreditView(credit);
  }

  async update(
    movieId: number,
    creditId: number,
    dto: UpdateCreditDto,
  ): Promise<CreditView> {
    const credit = await this.credits.findOnMovie(movieId, creditId);
    if (!credit) throw creditNotFound();
    // The role lives in the database, so this rule can't be in the DTO.
    if (dto.character && credit.role !== 'CAST') {
      throw new BadRequestException(CHARACTER_ONLY_ON_CAST);
    }
    return toCreditView(await this.credits.update(creditId, dto));
  }

  async delete(movieId: number, creditId: number): Promise<void> {
    if (!(await this.credits.deleteOnMovie(movieId, creditId))) {
      throw creditNotFound();
    }
  }

  private async assertMovieExists(movieId: number): Promise<void> {
    if (!(await this.movies.exists(movieId))) {
      throw new NotFoundException('Movie not found');
    }
  }
}

const creditNotFound = () => new NotFoundException('Credit not found');
