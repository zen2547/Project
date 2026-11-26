import { Injectable, NotFoundException } from '@nestjs/common';
import { MoviesRepository } from './movies.repository.js';
import { StreamingServicesRepository } from '../streaming-services/streaming-services.repository.js';
import { MediaRepository } from './media.repository.js';
import type {
  CreatePhotoDto,
  CreateTrailerDto,
  StreamingLinkDto,
} from './dto/media.dto.js';

@Injectable()
export class MediaService {
  constructor(
    private readonly media: MediaRepository,
    private readonly movies: MoviesRepository,
    private readonly services: StreamingServicesRepository,
  ) {}

  async addTrailer(movieId: number, dto: CreateTrailerDto) {
    await this.assertMovieExists(movieId);
    const { id, title, youtubeUrl } = await this.media.createTrailer(
      movieId,
      dto,
    );
    return { id, title, youtubeUrl };
  }

  async deleteTrailer(movieId: number, trailerId: number): Promise<void> {
    if (!(await this.media.deleteTrailer(movieId, trailerId))) {
      throw new NotFoundException('Trailer not found');
    }
  }

  async addPhoto(movieId: number, dto: CreatePhotoDto) {
    await this.assertMovieExists(movieId);
    const { id, url, caption } = await this.media.createPhoto(movieId, dto);
    return { id, url, caption };
  }

  async deletePhoto(movieId: number, photoId: number): Promise<void> {
    if (!(await this.media.deletePhoto(movieId, photoId))) {
      throw new NotFoundException('Photo not found');
    }
  }

  // Both ids are in the URL, so a missing Movie or Service is a 404.
  async putStreamingLink(
    movieId: number,
    serviceId: number,
    dto: StreamingLinkDto,
  ) {
    await this.assertMovieExists(movieId);
    if (!(await this.services.exists(serviceId))) {
      throw new NotFoundException('Streaming Service not found');
    }
    const { service, url } = await this.media.upsertStreamingLink(
      movieId,
      serviceId,
      dto.url,
    );
    return {
      service: { id: service.id, name: service.name, logoUrl: service.logoUrl },
      url,
    };
  }

  async deleteStreamingLink(movieId: number, serviceId: number): Promise<void> {
    if (!(await this.media.deleteStreamingLink(movieId, serviceId))) {
      throw new NotFoundException('Streaming Link not found');
    }
  }

  private async assertMovieExists(movieId: number): Promise<void> {
    if (!(await this.movies.exists(movieId))) {
      throw new NotFoundException('Movie not found');
    }
  }
}
