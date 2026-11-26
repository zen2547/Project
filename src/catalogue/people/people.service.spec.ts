import { ConflictException, NotFoundException } from '@nestjs/common';
import { PeopleService } from './people.service.js';
import type {
  PeopleRepository,
  PersonWithFilmography,
} from './people.repository.js';

const nolan: PersonWithFilmography = {
  id: 4,
  name: 'Christopher Nolan',
  bio: null,
  photoUrl: null,
  birthDate: new Date('1970-07-30T00:00:00Z'),
  credits: [
    {
      id: 10,
      movieId: 1,
      personId: 4,
      role: 'DIRECTOR',
      character: null,
      order: 0,
      movie: { id: 1, title: 'Inception', releaseYear: 2010, posterUrl: null },
    },
  ],
};

describe('PeopleService', () => {
  let repo: {
    list: ReturnType<typeof vi.fn>;
    findWithFilmography: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let service: PeopleService;

  beforeEach(() => {
    repo = {
      list: vi.fn(),
      findWithFilmography: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    service = new PeopleService(repo as unknown as PeopleRepository);
  });

  it('getPage: birthDate as YYYY-MM-DD and one filmography row per Credit', async () => {
    repo.findWithFilmography.mockResolvedValue(nolan);

    await expect(service.getPage(4)).resolves.toEqual({
      id: 4,
      name: 'Christopher Nolan',
      bio: null,
      photoUrl: null,
      birthDate: '1970-07-30',
      filmography: [
        {
          creditId: 10,
          role: 'DIRECTOR',
          character: null,
          movie: {
            id: 1,
            title: 'Inception',
            releaseYear: 2010,
            posterUrl: null,
          },
        },
      ],
    });
  });

  it('getPage: unknown id → 404', async () => {
    repo.findWithFilmography.mockResolvedValue(null);
    await expect(service.getPage(99)).rejects.toThrow(NotFoundException);
  });

  it('list wraps rows in { data, meta }', async () => {
    repo.list.mockResolvedValue({ rows: [nolan], total: 7 });

    await expect(service.list({ page: 2, limit: 1 })).resolves.toEqual({
      data: [{ id: 4, name: 'Christopher Nolan', photoUrl: null }],
      meta: { page: 2, limit: 1, total: 7 },
    });
  });

  it('delete: Person with Credits → 409, unknown → 404', async () => {
    repo.delete.mockResolvedValueOnce('has-credits');
    await expect(service.delete(4)).rejects.toThrow(ConflictException);

    repo.delete.mockResolvedValueOnce('not-found');
    await expect(service.delete(99)).rejects.toThrow(NotFoundException);
  });

  it('update: unknown id → 404', async () => {
    repo.update.mockResolvedValue(null);
    await expect(service.update(99, { name: 'X' })).rejects.toThrow(
      NotFoundException,
    );
  });
});
