import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { Role } from '../../identity/decorators/role.decorator.js';
import { idParamSchema } from '../../common/id-param.schema.js';
import { MediaService } from './media.service.js';
import {
  createPhotoSchema,
  createTrailerSchema,
  streamingLinkSchema,
  type CreatePhotoDto,
  type CreateTrailerDto,
  type StreamingLinkDto,
} from './dto/media.dto.js';

// Admin-only writes. Reading happens through GET /movies/:id.
@Role('ADMIN')
@Controller('movies/:movieId')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('trailers')
  addTrailer(
    @Param('movieId', { schema: idParamSchema }) movieId: number,
    @Body({ schema: createTrailerSchema }) dto: CreateTrailerDto,
  ) {
    return this.media.addTrailer(movieId, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('trailers/:trailerId')
  deleteTrailer(
    @Param('movieId', { schema: idParamSchema }) movieId: number,
    @Param('trailerId', { schema: idParamSchema }) trailerId: number,
  ) {
    return this.media.deleteTrailer(movieId, trailerId);
  }

  @Post('photos')
  addPhoto(
    @Param('movieId', { schema: idParamSchema }) movieId: number,
    @Body({ schema: createPhotoSchema }) dto: CreatePhotoDto,
  ) {
    return this.media.addPhoto(movieId, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('photos/:photoId')
  deletePhoto(
    @Param('movieId', { schema: idParamSchema }) movieId: number,
    @Param('photoId', { schema: idParamSchema }) photoId: number,
  ) {
    return this.media.deletePhoto(movieId, photoId);
  }

  // PUT = create or replace; 200 either way.
  @Put('streaming-links/:serviceId')
  putStreamingLink(
    @Param('movieId', { schema: idParamSchema }) movieId: number,
    @Param('serviceId', { schema: idParamSchema }) serviceId: number,
    @Body({ schema: streamingLinkSchema }) dto: StreamingLinkDto,
  ) {
    return this.media.putStreamingLink(movieId, serviceId, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('streaming-links/:serviceId')
  deleteStreamingLink(
    @Param('movieId', { schema: idParamSchema }) movieId: number,
    @Param('serviceId', { schema: idParamSchema }) serviceId: number,
  ) {
    return this.media.deleteStreamingLink(movieId, serviceId);
  }
}
