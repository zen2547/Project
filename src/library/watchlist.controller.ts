import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  Query,
} from '@nestjs/common';
import z from 'zod';
import { CurrentUser } from '../identity/decorators/current-user.decorator.js';
import { idParamSchema } from '../common/id-param.schema.js';
import { paginationShape, type PageQuery } from '../common/pagination.js';
import { LibraryService } from './library.service.js';

export const pageQuerySchema = z.object(paginationShape);

// "Add to Watchlist". Member-only: no @Public(), so AuthGuard needs a JWT.
// PUT/DELETE are idempotent: a double click is a 204, never an error.
@Controller('me/watchlist')
export class WatchlistController {
  constructor(private readonly library: LibraryService) {}

  @Get()
  list(
    @CurrentUser('id') userId: number,
    @Query({ schema: pageQuerySchema }) page: PageQuery,
  ) {
    return this.library.watchlist(userId, page);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Put(':movieId')
  add(
    @CurrentUser('id') userId: number,
    @Param('movieId', { schema: idParamSchema }) movieId: number,
  ) {
    return this.library.addToWatchlist(userId, movieId);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':movieId')
  remove(
    @CurrentUser('id') userId: number,
    @Param('movieId', { schema: idParamSchema }) movieId: number,
  ) {
    return this.library.removeFromWatchlist(userId, movieId);
  }
}
