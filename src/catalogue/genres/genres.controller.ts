import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Public } from '../../identity/decorators/public.decorator.js';
import { Role } from '../../identity/decorators/role.decorator.js';
import { idParamSchema } from '../../common/id-param.schema.js';
import { GenresService } from './genres.service.js';
import { genreSchema, type GenreDto } from './dto/genre.dto.js';

@Controller('genres')
export class GenresController {
  constructor(private readonly genres: GenresService) {}

  @Public()
  @Get()
  list() {
    return this.genres.list();
  }

  @Role('ADMIN')
  @Post()
  create(@Body({ schema: genreSchema }) dto: GenreDto) {
    return this.genres.create(dto);
  }

  @Role('ADMIN')
  @Patch(':id')
  rename(
    @Param('id', { schema: idParamSchema }) id: number,
    @Body({ schema: genreSchema }) dto: GenreDto,
  ) {
    return this.genres.rename(id, dto);
  }

  // 204: nothing to send back after a delete.
  @Role('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  delete(@Param('id', { schema: idParamSchema }) id: number) {
    return this.genres.delete(id);
  }
}
