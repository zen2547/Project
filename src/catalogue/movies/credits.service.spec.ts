import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CreditsService } from './credits.service.js';
import type {
  CreditsRepository,
  CreditWithPerson,
} from './credits.repository.js';
import type { MoviesRepository } from './movies.repository.js';
import type { PeopleRepository } from '../people/people.repository.js';

const directorCredit: CreditWithPerson = {
  id: 5,
  movieId: 1,
  personId: 4,
  role: 'DIRECTOR',
  character: null,
  order: 0,
  person: { id: 4, name: 'Christopher Nolan' },
};

describe('CreditsService', () => {
  let credits: {
    listForMovie: ReturnType<typeof vi.fn>;
    findOnMovie: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    deleteOnMovie: ReturnType<typeof vi.fn>;
  };
  let movies: { exists: ReturnType<typeof vi.fn> };
  let people: { exists: ReturnType<typeof vi.fn> };
  let service: CreditsService;

  beforeEach(() => {
    credits = {
      listForMovie: vi.fn(),
      findOnMovie: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteOnMovie: vi.fn(),
    };
    movies = { exists: vi.fn(async () => true) };
    people = { exists: vi.fn(async () => true) };
    service = new CreditsService(
      credits as unknown as CreditsRepository,
      movies as unknown as MoviesRepository,
      people as unknown as PeopleRepository,
    );
  });

  const director = { personId: 4, role: 'DIRECTOR' as const };

  it('create: unknown Movie → 404', async () => {
    movies.exists.mockResolvedValue(false);
    await expect(service.create(99, director)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('create: unknown Person → 400 naming the id', async () => {
    people.exists.mockResolvedValue(false);
    await expect(service.create(1, director)).rejects.toThrow(
      new BadRequestException('Unknown personId: 4'),
    );
    expect(credits.create).not.toHaveBeenCalled();
  });

  it('create: same Person + role twice → 409', async () => {
    credits.create.mockResolvedValue('duplicate');
    await expect(service.create(1, director)).rejects.toThrow(
      ConflictException,
    );
  });

  it('create returns the Credit view', async () => {
    credits.create.mockResolvedValue(directorCredit);
    await expect(service.create(1, director)).resolves.toEqual({
      creditId: 5,
      personId: 4,
      name: 'Christopher Nolan',
      role: 'DIRECTOR',
      character: null,
      order: 0,
    });
  });

  it('update: a character on a non-CAST Credit → 400', async () => {
    credits.findOnMovie.mockResolvedValue(directorCredit);
    await expect(service.update(1, 5, { character: 'Cobb' })).rejects.toThrow(
      BadRequestException,
    );
    expect(credits.update).not.toHaveBeenCalled();
  });

  it('update: Credit not on this Movie → 404', async () => {
    credits.findOnMovie.mockResolvedValue(null);
    await expect(service.update(2, 5, { order: 1 })).rejects.toThrow(
      NotFoundException,
    );
  });
});
