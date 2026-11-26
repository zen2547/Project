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

// Everything a Movie page shows. Movies and People join this module in
// Tasks 9–13.
@Module({
  controllers: [
    GenresController,
    KeywordsController,
    StreamingServicesController,
  ],
  providers: [
    GenresService,
    GenresRepository,
    KeywordsService,
    KeywordsRepository,
    StreamingServicesService,
    StreamingServicesRepository,
  ],
})
export class CatalogueModule {}
