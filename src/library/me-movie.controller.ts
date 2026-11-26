import { Controller, Get, Param } from '@nestjs/common';
import { CurrentUser } from '../identity/decorators/current-user.decorator.js';
import { idParamSchema } from '../common/id-param.schema.js';
import { LibraryService } from './library.service.js';

// The caller's own state for one Movie page. Kept apart from the public
// GET /movies/:id so that one stays the same for everyone (cacheable);
// the frontend calls both.
@Controller('me/movies')
export class MeMovieController {
  constructor(private readonly library: LibraryService) {}

  @Get(':movieId')
  state(
    @CurrentUser('id') userId: number,
    @Param('movieId', { schema: idParamSchema }) movieId: number,
  ) {
    return this.library.stateFor(userId, movieId);
  }
}
