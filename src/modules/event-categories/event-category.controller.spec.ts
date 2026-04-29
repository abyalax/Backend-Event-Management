import { JwtModule } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { REPOSITORY } from '~/common/constants/database';
import { CONFIG_SERVICE } from '~/infrastructure/config/config.provider';
import { mockRedis, mockRepository, mockConfigService } from '~/test/common/mock';
import { UserService } from '../users/user.service';
import { EventCategoryController } from './event-category.controller';
import { EventCategoryService } from './event-category.service';
import { EventCategoryCacheService } from './event-category-cache.service';
import { CONFIG_PROVIDER } from '~/common/constants/provider';
import { RedisService } from '~/infrastructure/redis/redis.service';
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from '~/infrastructure/cache/cache.service';

describe('EventCategoryController', () => {
  let controller: EventCategoryController;
  let eventCategoryService: EventCategoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'test-secret',
          privateKey: 'test-private-key',
          publicKey: 'test-public-key',
        }),
      ],
      controllers: [EventCategoryController],
      providers: [
        EventCategoryController,
        {
          provide: CONFIG_SERVICE,
          useValue: mockConfigService,
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
        EventCategoryService,
        EventCategoryCacheService,
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            getLock: jest.fn(),
            releaseLock: jest.fn(),
          },
        },
        {
          provide: REPOSITORY.EVENT_CATEGORY,
          useValue: mockRepository,
        },
        {
          provide: UserService,
          useValue: {
            findOneBy: jest.fn().mockResolvedValue({
              id: 1,
              name: 'Test User',
              email: 'test@example.com',
              roles: [],
            }),
          },
        },
        RedisService,
        {
          provide: CONFIG_PROVIDER.REDIS_CLIENT,
          useValue: mockRedis,
        },
      ],
    }).compile();

    controller = module.get<EventCategoryController>(EventCategoryController);
    eventCategoryService = module.get<EventCategoryService>(EventCategoryService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(eventCategoryService).toBeDefined();
  });
});
