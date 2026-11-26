import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { toPage, type Page } from '../../common/pagination.js';
import { PeopleRepository } from './people.repository.js';
import {
  toPersonDetails,
  toPersonPage,
  toPersonSummary,
  type PersonDetails,
  type PersonPage,
  type PersonSummary,
} from './person.js';
import type {
  CreatePersonDto,
  ListPeopleQuery,
  UpdatePersonDto,
} from './dto/person.dto.js';

@Injectable()
export class PeopleService {
  constructor(private readonly people: PeopleRepository) {}

  async list(query: ListPeopleQuery): Promise<Page<PersonSummary>> {
    const { rows, total } = await this.people.list(query);
    return toPage(rows.map(toPersonSummary), total, query);
  }

  async getPage(id: number): Promise<PersonPage> {
    const person = await this.people.findWithFilmography(id);
    if (!person) throw notFound();
    return toPersonPage(person);
  }

  async create(dto: CreatePersonDto): Promise<PersonDetails> {
    return toPersonDetails(await this.people.create(dto));
  }

  async update(id: number, dto: UpdatePersonDto): Promise<PersonDetails> {
    const person = await this.people.update(id, dto);
    if (!person) throw notFound();
    return toPersonDetails(person);
  }

  async delete(id: number): Promise<void> {
    const result = await this.people.delete(id);
    if (result === 'not-found') throw notFound();
    if (result === 'has-credits') {
      throw new ConflictException(
        'This Person still has Credits; remove them first',
      );
    }
  }
}

const notFound = () => new NotFoundException('Person not found');
