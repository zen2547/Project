import { Module } from '@nestjs/common';
import { CatalogueModule } from '../catalogue/catalogue.module.js';
import { LibraryRepository } from './library.repository.js';
import { LibraryService } from './library.service.js';
import { WatchlistController } from './watchlist.controller.js';
import { WatchedController } from './watched.controller.js';
import { MeMovieController } from './me-movie.controller.js';

// SPEC-library.md: a Member's Watchlist, Watched list and per-Movie state.
@Module({
  imports: [CatalogueModule],
  controllers: [WatchlistController, WatchedController, MeMovieController],
  providers: [LibraryRepository, LibraryService],
  // Reviews calls markWatched inside its own transaction.
  exports: [LibraryService],
})
export class LibraryModule {}
