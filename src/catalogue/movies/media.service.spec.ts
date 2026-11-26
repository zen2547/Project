import { NotFoundException } from '@nestjs/common';
import { MediaService } from './media.service.js';
import type { MediaRepository } from './media.repository.js';
import type { MoviesRepository } from './movies.repository.js';
import type { StreamingServicesRepository } from '../streaming-services/streaming-services.repository.js';

describe('MediaService', () => {
  let media: {
    createTrailer: ReturnType<typeof vi.fn>;
    upsertStreamingLink: ReturnType<typeof vi.fn>;
    deletePhoto: ReturnType<typeof vi.fn>;
  };
  let movies: { exists: ReturnType<typeof vi.fn> };
  let services: { exists: ReturnType<typeof vi.fn> };
  let service: MediaService;

  beforeEach(() => {
    media = {
      createTrailer: vi.fn(),
      upsertStreamingLink: vi.fn(),
      deletePhoto: vi.fn(),
    };
    movies = { exists: vi.fn(async () => true) };
    services = { exists: vi.fn(async () => true) };
    service = new MediaService(
      media as unknown as MediaRepository,
      movies as unknown as MoviesRepository,
      services as unknown as StreamingServicesRepository,
    );
  });

  it('addTrailer: unknown Movie → 404, nothing saved', async () => {
    movies.exists.mockResolvedValue(false);
    await expect(
      service.addTrailer(99, { title: 'T', youtubeUrl: 'https://youtu.be/x' }),
    ).rejects.toThrow(new NotFoundException('Movie not found'));
    expect(media.createTrailer).not.toHaveBeenCalled();
  });

  it('putStreamingLink: unknown Streaming Service → 404', async () => {
    services.exists.mockResolvedValue(false);
    await expect(
      service.putStreamingLink(1, 99, { url: 'https://netflix.com/x' }),
    ).rejects.toThrow(new NotFoundException('Streaming Service not found'));
    expect(media.upsertStreamingLink).not.toHaveBeenCalled();
  });

  it('putStreamingLink returns { service, url }', async () => {
    media.upsertStreamingLink.mockResolvedValue({
      movieId: 1,
      serviceId: 2,
      url: 'https://netflix.com/x',
      service: { id: 2, name: 'Netflix', logoUrl: null },
    });
    await expect(
      service.putStreamingLink(1, 2, { url: 'https://netflix.com/x' }),
    ).resolves.toEqual({
      service: { id: 2, name: 'Netflix', logoUrl: null },
      url: 'https://netflix.com/x',
    });
  });

  it('deletePhoto: not on this Movie → 404', async () => {
    media.deletePhoto.mockResolvedValue(false);
    await expect(service.deletePhoto(1, 9)).rejects.toThrow(NotFoundException);
  });
});
