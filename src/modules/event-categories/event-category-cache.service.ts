import { Injectable } from '@nestjs/common';
import { PaginateQuery } from 'nestjs-paginate';
import { CacheService } from '~/infrastructure/cache/cache.service';
import { QueryEventCategoryDto } from './dto/query-event-category.dto';
import { EventCategory } from './entity/event-category.entity';
import { EventCategoryService } from './event-category.service';
import { CreateEventCategoryDto } from './dto/create-event-category.dto';
import { UpdateEventCategoryDto } from './dto/update-event-category.dto';

@Injectable()
export class EventCategoryCacheService {
  private readonly KEY_PREFIX = 'event-category';
  private readonly TTL_BY_ID = 600; // 10 minutes

  constructor(
    private readonly cache: CacheService,
    private readonly eventCategoryService: EventCategoryService,
  ) {}

  private keyById(id: number): string {
    return `${this.KEY_PREFIX}:by-id:${id}`;
  }

  private keyList(query: QueryEventCategoryDto): string {
    const searchKey = query.search ? `:search:${query.search}` : '';
    const sortKey = query.sort_by && query.sort_order ? `:sort:${query.sort_by}:${query.sort_order}` : '';
    return `${this.KEY_PREFIX}:list:page:${query.page}:limit:${query.limit}${searchKey}${sortKey}`;
  }

  private keyIds(): string {
    return `${this.KEY_PREFIX}:ids`;
  }

  async getById(id: number): Promise<EventCategory | null> {
    return this.cache.getOrSet(this.keyById(id), () => this.eventCategoryService.findOneByID(id), this.TTL_BY_ID);
  }

  async getList(query: QueryEventCategoryDto) {
    const sortBy: [string, string][] = query.sort_by && query.sort_order ? [[query.sort_by, query.sort_order]] : [['updatedAt', 'DESC']];
    const mappedQuery: PaginateQuery = {
      page: query.page,
      limit: query.limit,
      search: query.search,
      sortBy,
      path: '',
    };

    return this.cache.getOrSet(this.keyList(mappedQuery), () => this.eventCategoryService.list(mappedQuery), 300);
  }

  async getIds(): Promise<number[]> {
    return this.cache.getOrSet(this.keyIds(), () => this.eventCategoryService.getIds(), 600);
  }

  async create(createEventCategoryDto: CreateEventCategoryDto) {
    const eventCategory = await this.eventCategoryService.create(createEventCategoryDto);
    await this.invalidateList();
    await this.invalidateIds();
    return eventCategory;
  }

  async update(id: number, updateEventCategoryDto: UpdateEventCategoryDto) {
    const eventCategory = await this.eventCategoryService.update(id, updateEventCategoryDto);
    await this.invalidateOnMutation(id);
    return eventCategory;
  }

  async delete(id: string) {
    const removed = await this.eventCategoryService.remove(id);
    await this.invalidateOnMutation(Number(id));
    await this.invalidateIds();
    return removed;
  }

  async invalidateById(id: number): Promise<void> {
    await this.cache.clear(this.keyById(id));
  }

  async invalidateList(): Promise<void> {
    await this.cache.clearByPattern(`${this.KEY_PREFIX}:list:*`);
  }

  async invalidateIds(): Promise<void> {
    await this.cache.clear(this.keyIds());
  }

  async invalidateOnMutation(id?: number): Promise<void> {
    if (id) await this.invalidateById(id);
    await this.invalidateList();
  }
}
