import { ConflictException, NotFoundException } from '@nestjs/common';
import { KeywordsService } from './keywords.service.js';
import type { KeywordsRepository } from './keywords.repository.js';

describe('KeywordsService', () => {
  let repo: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    rename: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let service: KeywordsService;

  beforeEach(() => {
    repo = { list: vi.fn(), create: vi.fn(), rename: vi.fn(), delete: vi.fn() };
    service = new KeywordsService(repo as unknown as KeywordsRepository);
  });

  it('create returns the new Keyword', async () => {
    repo.create.mockResolvedValue({ id: 1, name: 'Dream' });
    await expect(service.create({ name: 'Dream' })).resolves.toEqual({
      id: 1,
      name: 'Dream',
    });
  });

  it('create: a taken name → 409', async () => {
    repo.create.mockResolvedValue('duplicate');
    await expect(service.create({ name: 'Dream' })).rejects.toThrow(
      ConflictException,
    );
  });

  it('rename: unknown id → 404', async () => {
    repo.rename.mockResolvedValue(null);
    await expect(service.rename(99, { name: 'Dream' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rename: a taken name → 409', async () => {
    repo.rename.mockResolvedValue('duplicate');
    await expect(service.rename(1, { name: 'Dream' })).rejects.toThrow(
      ConflictException,
    );
  });

  it('delete: unknown id → 404', async () => {
    repo.delete.mockResolvedValue(false);
    await expect(service.delete(99)).rejects.toThrow(NotFoundException);
  });
});
