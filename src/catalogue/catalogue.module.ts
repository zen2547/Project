import { Module } from '@nestjs/common';
import { GenresController } from './genres/genres.controller.js';
import { GenresService } from './genres/genres.service.js';
import { GenresRepository } from './genres/genres.repository.js';
import { KeywordsController } from './keywords/keywords.controller.js';
import { KeywordsService } from './keywords/keywords.service.js';
import { KeywordsRepository } from './keywords/keywords.repository.js';

// Everything a Movie page shows. Movies, People and Streaming Services join
// this module in Tasks 8–13.
@Module({
  controllers: [GenresController, KeywordsController],
  providers: [
    GenresService,
    GenresRepository,
    KeywordsService,
    KeywordsRepository,
  ],
})
export class CatalogueModule {}
