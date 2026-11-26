import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { StreamingService } from '../../prisma/generated/prisma/client.js';
import { StreamingServicesRepository } from './streaming-services.repository.js';
import type {
  CreateStreamingServiceDto,
  UpdateStreamingServiceDto,
} from './dto/streaming-service.dto.js';

@Injectable()
export class StreamingServicesService {
  constructor(private readonly services: StreamingServicesRepository) {}

  list(): Promise<StreamingService[]> {
    return this.services.list();
  }

  async create(dto: CreateStreamingServiceDto): Promise<StreamingService> {
    const service = await this.services.create(dto);
    if (service === 'duplicate') throw nameTaken();
    return service;
  }

  async update(
    id: number,
    dto: UpdateStreamingServiceDto,
  ): Promise<StreamingService> {
    const service = await this.services.update(id, dto);
    if (service === null) throw notFound();
    if (service === 'duplicate') throw nameTaken();
    return service;
  }

  async delete(id: number): Promise<void> {
    if (!(await this.services.delete(id))) throw notFound();
  }
}

const notFound = () => new NotFoundException('Streaming Service not found');
const nameTaken = () =>
  new ConflictException('Streaming Service name already exists');
