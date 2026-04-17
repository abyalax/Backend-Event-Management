import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { paginate, PaginateQuery } from 'nestjs-paginate';
import { Repository } from 'typeorm';
import { REPOSITORY } from '~/common/constants/database';
import { CreateEventCategoryDto } from './dto/create-event-category.dto';
import { UpdateEventCategoryDto } from './dto/update-event-category.dto';
import { EventCategory } from './entity/event-category.entity';
import { EVENT_CATEGORY_PAGINATION_CONFIG } from './event-category-pagination.config';

@Injectable()
export class EventCategoryService {
  constructor(
    @Inject(REPOSITORY.EVENT_CATEGORY)
    private readonly eventCategoryRepository: Repository<EventCategory>,
  ) {}

  async list(query: PaginateQuery) {
    return paginate(query, this.eventCategoryRepository, EVENT_CATEGORY_PAGINATION_CONFIG);
  }

  async getIds(): Promise<number[]> {
    const rows = await this.eventCategoryRepository.find({ select: {} });
    return rows.map((r) => Number(r.id));
  }

  async create(payloadEvent: CreateEventCategoryDto): Promise<EventCategory> {
    const eventCategory = this.eventCategoryRepository.create(payloadEvent);
    return await this.eventCategoryRepository.save(eventCategory);
  }

  async findOneByID(id: number): Promise<EventCategory> {
    const data = await this.eventCategoryRepository.findOneBy({ id });
    if (data === null) throw new NotFoundException('Event Category not found');
    return data;
  }

  async update(id: number, payloadEvent: UpdateEventCategoryDto) {
    const eventCategory = await this.eventCategoryRepository.preload({
      id: id,
      ...payloadEvent,
    });
    if (!eventCategory) throw new NotFoundException(`Event Category with ID ${id} not found`);
    return await this.eventCategoryRepository.save(eventCategory);
  }

  async remove(id: string): Promise<boolean> {
    const Event = await this.eventCategoryRepository.delete(id);
    if (Event.affected === 0) throw new NotFoundException(`Event Category with ID ${id} not found`);
    return true;
  }
}
