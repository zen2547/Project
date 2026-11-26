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
import { CreditsService } from './credits.service.js';
import {
  createCreditSchema,
  updateCreditSchema,
  type CreateCreditDto,
  type UpdateCreditDto,
} from './dto/credit.dto.js';

// Cast & crew of one Movie.
@Controller('movies/:movieId/credits')
export class CreditsController {
  constructor(private readonly credits: CreditsService) {}

  @Public()
  @Get()
  list(@Param('movieId', { schema: idParamSchema }) movieId: number) {
    return this.credits.list(movieId);
  }

  @Role('ADMIN')
  @Post()
  create(
    @Param('movieId', { schema: idParamSchema }) movieId: number,
    @Body({ schema: createCreditSchema }) dto: CreateCreditDto,
  ) {
    return this.credits.create(movieId, dto);
  }

  @Role('ADMIN')
  @Patch(':creditId')
  update(
    @Param('movieId', { schema: idParamSchema }) movieId: number,
    @Param('creditId', { schema: idParamSchema }) creditId: number,
    @Body({ schema: updateCreditSchema }) dto: UpdateCreditDto,
  ) {
    return this.credits.update(movieId, creditId, dto);
  }

  @Role('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':creditId')
  delete(
    @Param('movieId', { schema: idParamSchema }) movieId: number,
    @Param('creditId', { schema: idParamSchema }) creditId: number,
  ) {
    return this.credits.delete(movieId, creditId);
  }
}
