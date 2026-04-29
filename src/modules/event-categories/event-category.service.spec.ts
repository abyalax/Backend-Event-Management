import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { REPOSITORY } from '~/common/constants/database';
import { mockRedis, mockRepository, mockConfigService } from '~/test/common/mock';
import { EventCategory } from './entity/event-category.entity';
import { EventCategoryService } from './event-category.service';
import { CONFIG_PROVIDER } from '~/common/constants/provider';
import { CONFIG_SERVICE } from '~/infrastructure/config/config.provider';
import { CacheService } from '~/infrastructure/cache/cache.service';
import { RedisService } from '~/infrastructure/redis/redis.service';
import { PinoLogger } from 'nestjs-pino';

describe('EventCategoryService', () => {
  let service: EventCategoryService;
  let categoryRepository: Repository<EventCategory>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [],
      providers: [
        EventCategoryService,
        {
          provide: CONFIG_SERVICE,
          useValue: mockConfigService,
        },
        {
          provide: 'PinoLogger',
          useValue: {
            setContext: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
          },
        },
        {
          provide: REPOSITORY.EVENT_CATEGORY,
          useValue: mockRepository,
        },
        {
          provide: PinoLogger,
          useValue: {
            setContext: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
          },
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
