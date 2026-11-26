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
  Query,
} from '@nestjs/common';
import { Public } from '../../identity/decorators/public.decorator.js';
import { Role } from '../../identity/decorators/role.decorator.js';
import { idParamSchema } from '../../common/id-param.schema.js';
import { MoviesService } from './movies.service.js';
import {
  createMovieSchema,
  updateMovieSchema,
  type CreateMovieDto,
  type UpdateMovieDto,
} from './dto/movie.dto.js';
import {
  listMoviesSchema,
  type ListMoviesQuery,
} from './dto/list-movies.dto.js';

@Controller('movies')
export class MoviesController {
  constructor(private readonly movies: MoviesService) {}

  @Public()
  @Get()
  list(@Query({ schema: listMoviesSchema }) query: ListMoviesQuery) {
    return this.movies.list(query);
  }

  @Public()
  @Get(':id')
  getPage(@Param('id', { schema: idParamSchema }) id: number) {
    return this.movies.getPage(id);
  }

  @Role('ADMIN')
  @Post()
  create(@Body({ schema: createMovieSchema }) dto: CreateMovieDto) {
    return this.movies.create(dto);
  }

  @Role('ADMIN')
  @Patch(':id')
  update(
    @Param('id', { schema: idParamSchema }) id: number,
    @Body({ schema: updateMovieSchema }) dto: UpdateMovieDto,
  ) {
    return this.movies.update(id, dto);
  }

  @Role('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  delete(@Param('id', { schema: idParamSchema }) id: number) {
    return this.movies.delete(id);
  }
}
