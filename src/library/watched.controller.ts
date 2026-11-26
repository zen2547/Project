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
import { CurrentUser } from '../identity/decorators/current-user.decorator.js';
import { idParamSchema } from '../common/id-param.schema.js';
import type { PageQuery } from '../common/pagination.js';
import { LibraryService } from './library.service.js';
import { pageQuerySchema } from './watchlist.controller.js';

// "Mark as watched". Same rules as the Watchlist; the two lists are
// independent of each other.
@Controller('me/watched')
export class WatchedController {
  constructor(private readonly library: LibraryService) {}

  @Get()
  list(
    @CurrentUser('id') userId: number,
    @Query({ schema: pageQuerySchema }) page: PageQuery,
  ) {
    return this.library.watched(userId, page);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Put(':movieId')
  mark(
    @CurrentUser('id') userId: number,
    @Param('movieId', { schema: idParamSchema }) movieId: number,
  ) {
    return this.library.markWatchedByMember(userId, movieId);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':movieId')
  unmark(
    @CurrentUser('id') userId: number,
    @Param('movieId', { schema: idParamSchema }) movieId: number,
  ) {
    return this.library.unmarkWatched(userId, movieId);
  }
}
