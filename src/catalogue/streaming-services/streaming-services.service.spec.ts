import { ConflictException, NotFoundException } from '@nestjs/common';
import { StreamingServicesService } from './streaming-services.service.js';
import type { StreamingServicesRepository } from './streaming-services.repository.js';

const netflix = { id: 1, name: 'Netflix', logoUrl: null };

describe('StreamingServicesService', () => {
  let repo: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let service: StreamingServicesService;

  beforeEach(() => {
    repo = { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() };
    service = new StreamingServicesService(
      repo as unknown as StreamingServicesRepository,
    );
  });

  it('create returns the new Streaming Service', async () => {
    repo.create.mockResolvedValue(netflix);
    await expect(service.create({ name: 'Netflix' })).resolves.toEqual(netflix);
  });

  it('create: a taken name → 409', async () => {
    repo.create.mockResolvedValue('duplicate');
    await expect(service.create({ name: 'Netflix' })).rejects.toThrow(
      ConflictException,
    );
  });

  it('update passes only the sent fields to the repository', async () => {
    repo.update.mockResolvedValue(netflix);
    await service.update(1, { logoUrl: null });
    expect(repo.update).toHaveBeenCalledWith(1, { logoUrl: null });
  });

  it('update: unknown id → 404, taken name → 409', async () => {
    repo.update.mockResolvedValueOnce(null);
    await expect(service.update(99, { name: 'x' })).rejects.toThrow(
      NotFoundException,
    );

    repo.update.mockResolvedValueOnce('duplicate');
    await expect(service.update(1, { name: 'x' })).rejects.toThrow(
      ConflictException,
    );
  });

  it('delete: unknown id → 404', async () => {
    repo.delete.mockResolvedValue(false);
    await expect(service.delete(99)).rejects.toThrow(NotFoundException);
  });
});
