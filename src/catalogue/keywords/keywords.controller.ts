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
import { KeywordsService } from './keywords.service.js';
import { keywordSchema, type KeywordDto } from './dto/keyword.dto.js';

@Controller('keywords')
export class KeywordsController {
  constructor(private readonly keywords: KeywordsService) {}

  @Public()
  @Get()
  list() {
    return this.keywords.list();
  }

  @Role('ADMIN')
  @Post()
  create(@Body({ schema: keywordSchema }) dto: KeywordDto) {
    return this.keywords.create(dto);
  }

  @Role('ADMIN')
  @Patch(':id')
  rename(
    @Param('id', { schema: idParamSchema }) id: number,
    @Body({ schema: keywordSchema }) dto: KeywordDto,
  ) {
    return this.keywords.rename(id, dto);
  }

  // 204: nothing to send back after a delete.
  @Role('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  delete(@Param('id', { schema: idParamSchema }) id: number) {
    return this.keywords.delete(id);
  }
}
