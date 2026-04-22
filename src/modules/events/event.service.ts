import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { paginate, PaginateQuery } from 'nestjs-paginate';
import { Repository } from 'typeorm';
import { REPOSITORY } from '~/common/constants/database';
import { EventCategory } from '../event-categories/entity/event-category.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Event } from './entity/event.entity';
import { EVENT_PAGINATION_CONFIG } from './event-pagination.config';

@Injectable()
export class EventService {
  constructor(
    @Inject(REPOSITORY.EVENT)
    private readonly eventRepository: Repository<Event>,

    @Inject(REPOSITORY.EVENT_CATEGORY)
    private readonly categoryRepository: Repository<EventCategory>,
  ) {}

  async list(query: PaginateQuery) {
    return paginate(query, this.eventRepository, EVENT_PAGINATION_CONFIG);
  }

  async getIds(): Promise<number[]> {
    const rows = await this.eventRepository.find({ select: {} });
    return rows.map((r) => Number(r.id));
  }

  async create(payloadEvent: CreateEventDto): Promise<Event> {
    const category = await this.categoryRepository.findOneOrFail({ where: { id: payloadEvent.categoryId } });
    const Event = await this.eventRepository.save({
      ...payloadEvent,
      categoryId: payloadEvent.categoryId.toString(),
      category,
    });
    return Event;
  }

  async findOneByID(id: string): Promise<Event> {
    const Events = await this.eventRepository.findOneBy({ id });
    if (Events === null) throw new NotFoundException('Event not found');
    return Events;
  }

  async update(id: string, payloadEvent: UpdateEventDto): Promise<boolean> {
    const category = await this.categoryRepository.findOneOrFail({ where: { id: payloadEvent.categoryId } });
    const Event = await this.eventRepository.update(id, {
      ...payloadEvent,
      categoryId: payloadEvent.categoryId?.toString(),
      category,
    });
    if (Event.affected === 0) throw new NotFoundException();
    return true;
  }

  async remove(id: string): Promise<boolean> {
    const Event = await this.eventRepository.delete(id);
    if (Event.affected === 0) throw new NotFoundException();
    return true;
  }
}
