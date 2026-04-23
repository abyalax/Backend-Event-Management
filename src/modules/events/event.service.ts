import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { paginate, PaginateQuery } from 'nestjs-paginate';
import { REPOSITORY } from '~/common/constants/database';
import { EventCategory } from '../event-categories/entity/event-category.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Event } from './entity/event.entity';
import { EventRepository } from './event.repository';
import { EVENT_PAGINATION_CONFIG } from './event-pagination.config';

@Injectable()
export class EventService {
  constructor(
    @Inject(REPOSITORY.EVENT)
    private readonly eventRepository: Repository<Event>,

    @Inject(REPOSITORY.EVENT_CATEGORY)
    private readonly categoryRepository: Repository<EventCategory>,
    private readonly eventRepositoryCustom: EventRepository,
  ) {}

  async list(query: PaginateQuery) {
    return paginate(query, this.eventRepository, EVENT_PAGINATION_CONFIG);
  }

  async create(payloadEvent: CreateEventDto): Promise<Event> {
    return this.eventRepositoryCustom.createWithBanner(payloadEvent);
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
