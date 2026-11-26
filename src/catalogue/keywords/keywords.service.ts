import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Keyword } from '../../prisma/generated/prisma/client.js';
import { KeywordsRepository } from './keywords.repository.js';
import type { KeywordDto } from './dto/keyword.dto.js';

@Injectable()
export class KeywordsService {
  constructor(private readonly keywords: KeywordsRepository) {}

  list(): Promise<Keyword[]> {
    return this.keywords.list();
  }

  async create(dto: KeywordDto): Promise<Keyword> {
    const keyword = await this.keywords.create(dto.name);
    if (keyword === 'duplicate') throw nameTaken();
    return keyword;
  }

  async rename(id: number, dto: KeywordDto): Promise<Keyword> {
    const keyword = await this.keywords.rename(id, dto.name);
    if (keyword === null) throw notFound();
    if (keyword === 'duplicate') throw nameTaken();
    return keyword;
  }

  async delete(id: number): Promise<void> {
    if (!(await this.keywords.delete(id))) throw notFound();
  }
}

const notFound = () => new NotFoundException('Keyword not found');
const nameTaken = () => new ConflictException('Keyword name already exists');
