import { Module } from '@nestjs/common';
import { GenresController } from './genres/genres.controller.js';
import { GenresService } from './genres/genres.service.js';
import { GenresRepository } from './genres/genres.repository.js';
import { KeywordsController } from './keywords/keywords.controller.js';
import { KeywordsService } from './keywords/keywords.service.js';
import { KeywordsRepository } from './keywords/keywords.repository.js';
import { StreamingServicesController } from './streaming-services/streaming-services.controller.js';
import { StreamingServicesService } from './streaming-services/streaming-services.service.js';
import { StreamingServicesRepository } from './streaming-services/streaming-services.repository.js';
import { MoviesController } from './movies/movies.controller.js';
import { MoviesService } from './movies/movies.service.js';
import { MoviesRepository } from './movies/movies.repository.js';

// Everything a Movie page shows. People, Credits and media join this module
// in Tasks 11–13.
@Module({
  controllers: [
    MoviesController,
    GenresController,
    KeywordsController,
    StreamingServicesController,
  ],
  providers: [
    MoviesService,
    MoviesRepository,
    GenresService,
    GenresRepository,
    KeywordsService,
    KeywordsRepository,
    StreamingServicesService,
    StreamingServicesRepository,
  ],
})
export class CatalogueModule {}
