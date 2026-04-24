import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { REPOSITORY } from '~/common/constants/database';
import { ConfigModule } from '~/infrastructure/config/config.module';
import { LoggerModule } from '~/common/logger/logger.module';
import { CacheService } from '~/infrastructure/cache/cache.service';
import { RedisService } from '~/infrastructure/redis/redis.service';
import { mockRedis, mockRepository } from '~/test/common/mock';
import { EventCategory } from './entity/event-category.entity';
import { EventCategoryService } from './event-category.service';
import { CONFIG_PROVIDER } from '~/common/constants/provider';

describe('EventCategoryService', () => {
  let service: EventCategoryService;
  let categoryRepository: Repository<EventCategory>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule, LoggerModule],
      providers: [
        EventCategoryService,
        {
          provide: REPOSITORY.EVENT_CATEGORY,
          useValue: mockRepository,
        },
        CacheService,
        RedisService,
        {
          provide: CONFIG_PROVIDER.REDIS_CLIENT,
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<EventCategoryService>(EventCategoryService);
    categoryRepository = module.get<Repository<EventCategory>>(REPOSITORY.EVENT_CATEGORY);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(categoryRepository).toBeDefined();
  });
});
