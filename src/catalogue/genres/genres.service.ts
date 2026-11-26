import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Genre } from '../../prisma/generated/prisma/client.js';
import { GenresRepository } from './genres.repository.js';
import type { GenreDto } from './dto/genre.dto.js';

@Injectable()
export class GenresService {
  constructor(private readonly genres: GenresRepository) {}

  list(): Promise<Genre[]> {
    return this.genres.list();
  }

  async create(dto: GenreDto): Promise<Genre> {
    const genre = await this.genres.create(dto.name);
    if (genre === 'duplicate') throw nameTaken();
    return genre;
  }

  async rename(id: number, dto: GenreDto): Promise<Genre> {
    const genre = await this.genres.rename(id, dto.name);
    if (genre === null) throw notFound();
    if (genre === 'duplicate') throw nameTaken();
    return genre;
  }

  async delete(id: number): Promise<void> {
    if (!(await this.genres.delete(id))) throw notFound();
  }
}

const notFound = () => new NotFoundException('Genre not found');
const nameTaken = () => new ConflictException('Genre name already exists');
