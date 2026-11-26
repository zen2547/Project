import { ConflictException, NotFoundException } from '@nestjs/common';
import { GenresService } from './genres.service.js';
import type { GenresRepository } from './genres.repository.js';

describe('GenresService', () => {
  let repo: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    rename: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let service: GenresService;

  beforeEach(() => {
    repo = { list: vi.fn(), create: vi.fn(), rename: vi.fn(), delete: vi.fn() };
    service = new GenresService(repo as unknown as GenresRepository);
  });

  it('create returns the new Genre', async () => {
    repo.create.mockResolvedValue({ id: 1, name: 'Drama' });
    await expect(service.create({ name: 'Drama' })).resolves.toEqual({
      id: 1,
      name: 'Drama',
    });
  });

  it('create: a taken name → 409', async () => {
    repo.create.mockResolvedValue('duplicate');
    await expect(service.create({ name: 'Drama' })).rejects.toThrow(
      ConflictException,
    );
  });

  it('rename: unknown id → 404', async () => {
    repo.rename.mockResolvedValue(null);
    await expect(service.rename(99, { name: 'Drama' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rename: a taken name → 409', async () => {
    repo.rename.mockResolvedValue('duplicate');
    await expect(service.rename(1, { name: 'Drama' })).rejects.toThrow(
      ConflictException,
    );
  });

  it('delete: unknown id → 404', async () => {
    repo.delete.mockResolvedValue(false);
    await expect(service.delete(99)).rejects.toThrow(NotFoundException);
  });
});
