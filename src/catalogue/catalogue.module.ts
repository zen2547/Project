import { Module } from '@nestjs/common';
import { MoviesController } from './movies/movies.controller.js';
import { MoviesService } from './movies/movies.service.js';
import { MoviesRepository } from './movies/movies.repository.js';
import { CreditsController } from './movies/credits.controller.js';
import { CreditsService } from './movies/credits.service.js';
import { CreditsRepository } from './movies/credits.repository.js';
import { MediaController } from './movies/media.controller.js';
import { MediaService } from './movies/media.service.js';
import { MediaRepository } from './movies/media.repository.js';
import { PeopleController } from './people/people.controller.js';
import { PeopleService } from './people/people.service.js';
import { PeopleRepository } from './people/people.repository.js';
import { GenresController } from './genres/genres.controller.js';
import { GenresService } from './genres/genres.service.js';
import { GenresRepository } from './genres/genres.repository.js';
import { KeywordsController } from './keywords/keywords.controller.js';
import { KeywordsService } from './keywords/keywords.service.js';
import { KeywordsRepository } from './keywords/keywords.repository.js';
import { StreamingServicesController } from './streaming-services/streaming-services.controller.js';
import { StreamingServicesService } from './streaming-services/streaming-services.service.js';
import { StreamingServicesRepository } from './streaming-services/streaming-services.repository.js';

// Everything a Movie page shows (SPEC-catalogue.md).
@Module({
  controllers: [
    MoviesController,
    CreditsController,
    MediaController,
    PeopleController,
    GenresController,
    KeywordsController,
    StreamingServicesController,
  ],
  providers: [
    MoviesService,
    MoviesRepository,
    CreditsService,
    CreditsRepository,
    MediaService,
    MediaRepository,
    PeopleService,
    PeopleRepository,
    GenresService,
    GenresRepository,
    KeywordsService,
    KeywordsRepository,
    StreamingServicesService,
    StreamingServicesRepository,
  ],
  // Reviews (Task 17) will need MoviesRepository to check a Movie exists.
  exports: [MoviesRepository],
})
export class CatalogueModule {}
