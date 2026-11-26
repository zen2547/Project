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
import { PeopleService } from './people.service.js';
import {
  createPersonSchema,
  listPeopleSchema,
  updatePersonSchema,
  type CreatePersonDto,
  type ListPeopleQuery,
  type UpdatePersonDto,
} from './dto/person.dto.js';

@Controller('people')
export class PeopleController {
  constructor(private readonly people: PeopleService) {}

  @Public()
  @Get()
  list(@Query({ schema: listPeopleSchema }) query: ListPeopleQuery) {
    return this.people.list(query);
  }

  @Public()
  @Get(':id')
  getPage(@Param('id', { schema: idParamSchema }) id: number) {
    return this.people.getPage(id);
  }

  @Role('ADMIN')
  @Post()
  create(@Body({ schema: createPersonSchema }) dto: CreatePersonDto) {
    return this.people.create(dto);
  }

  @Role('ADMIN')
  @Patch(':id')
  update(
    @Param('id', { schema: idParamSchema }) id: number,
    @Body({ schema: updatePersonSchema }) dto: UpdatePersonDto,
  ) {
    return this.people.update(id, dto);
  }

  @Role('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  delete(@Param('id', { schema: idParamSchema }) id: number) {
    return this.people.delete(id);
  }
}
