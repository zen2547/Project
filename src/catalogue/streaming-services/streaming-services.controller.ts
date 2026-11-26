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
import { StreamingServicesService } from './streaming-services.service.js';
import {
  createStreamingServiceSchema,
  updateStreamingServiceSchema,
  type CreateStreamingServiceDto,
  type UpdateStreamingServiceDto,
} from './dto/streaming-service.dto.js';

@Controller('streaming-services')
export class StreamingServicesController {
  constructor(private readonly services: StreamingServicesService) {}

  @Public()
  @Get()
  list() {
    return this.services.list();
  }

  @Role('ADMIN')
  @Post()
  create(
    @Body({ schema: createStreamingServiceSchema })
    dto: CreateStreamingServiceDto,
  ) {
    return this.services.create(dto);
  }

  @Role('ADMIN')
  @Patch(':id')
  update(
    @Param('id', { schema: idParamSchema }) id: number,
    @Body({ schema: updateStreamingServiceSchema })
    dto: UpdateStreamingServiceDto,
  ) {
    return this.services.update(id, dto);
  }

  @Role('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  delete(@Param('id', { schema: idParamSchema }) id: number) {
    return this.services.delete(id);
  }
}
