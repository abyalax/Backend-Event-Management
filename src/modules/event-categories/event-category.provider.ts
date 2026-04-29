import { Provider } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { REPOSITORY } from '~/common/constants/database';
import { PostgreeConnection } from '~/infrastructure/database/database.provider';
import { EventCategory } from './entity/event-category.entity';
import { CacheService } from '~/infrastructure/cache/cache.service';
import { RedisService } from '~/infrastructure/redis/redis.service';
import { EventCategoryCacheService } from './event-category-cache.service';
import { EventCategoryService } from './event-category.service';

export const eventCategoryProvider: Provider[] = [
  EventCategoryService,
  CacheService,
  RedisService,
  EventCategoryCacheService,
  {
    provide: REPOSITORY.EVENT_CATEGORY,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(EventCategory),
    inject: [PostgreeConnection.provide],
  },
];
