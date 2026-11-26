import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  Photo,
  Prisma,
  Trailer,
} from '../../prisma/generated/prisma/client.js';
import type { CreatePhotoDto, CreateTrailerDto } from './dto/media.dto.js';

export type StreamingLinkWithService = Prisma.StreamingLinkGetPayload<{
  include: { service: true };
}>;

// Trailers, Photos and Streaming Links of a Movie. Deletes are scoped to the
// Movie in the URL, so /movies/1/photos/9 can't delete Movie 2's photo 9.
@Injectable()
export class MediaRepository {
  constructor(private readonly prisma: PrismaService) {}

  createTrailer(movieId: number, dto: CreateTrailerDto): Promise<Trailer> {
    return this.prisma.trailer.create({ data: { movieId, ...dto } });
  }

  async deleteTrailer(movieId: number, trailerId: number): Promise<boolean> {
    const { count } = await this.prisma.trailer.deleteMany({
      where: { id: trailerId, movieId },
    });
    return count > 0;
  }

  createPhoto(movieId: number, dto: CreatePhotoDto): Promise<Photo> {
    return this.prisma.photo.create({ data: { movieId, ...dto } });
  }

  async deletePhoto(movieId: number, photoId: number): Promise<boolean> {
    const { count } = await this.prisma.photo.deleteMany({
      where: { id: photoId, movieId },
    });
    return count > 0;
  }

  // Create or replace: PUT twice → still one row, with the newest URL.
  upsertStreamingLink(
    movieId: number,
    serviceId: number,
    url: string,
  ): Promise<StreamingLinkWithService> {
    return this.prisma.streamingLink.upsert({
      where: { movieId_serviceId: { movieId, serviceId } },
      create: { movieId, serviceId, url },
      update: { url },
      include: { service: true },
    });
  }

  async deleteStreamingLink(
    movieId: number,
    serviceId: number,
  ): Promise<boolean> {
    const { count } = await this.prisma.streamingLink.deleteMany({
      where: { movieId, serviceId },
    });
    return count > 0;
  }
}
