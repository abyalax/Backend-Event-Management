import { JwtModule } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { REPOSITORY } from '~/common/constants/database';
import { CONFIG_SERVICE } from '~/infrastructure/config/config.provider';
import {
  mockRedis,
  mockRepository,
  mockConfigService,
  mockStorageService,
  mockRedisService,
  mockQueueService,
  mockEventRepository,
} from '~/test/common/mock';
import { EventController } from './event.controller';
import { EventService } from './event.service';
import { PinoLogger } from 'nestjs-pino';
import { CONFIG_PROVIDER } from '~/common/constants/provider';
import { StorageService } from '~/infrastructure/storage/storage.service';
import { RedisService } from '~/infrastructure/redis/redis.service';
import { QueueService } from '~/infrastructure/queue/queue.service';
import { EventRepository } from './event.repository';

describe('EventController', () => {
  let controller: EventController;
  let eventService: EventService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'test-secret',
          privateKey: 'test-private-key',
          publicKey: 'test-public-key',
        }),
      ],
      controllers: [EventController],
      providers: [
        EventService,
        {
          provide: CONFIG_SERVICE,
          useValue: mockConfigService,
        },
        {
          provide: 'pino-params',
          useValue: {},
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
        {
          provide: REPOSITORY.EVENT,
          useValue: mockRepository,
        },
        {
          provide: REPOSITORY.EVENT_CATEGORY,
          useValue: mockRepository,
        },
        {
          provide: REPOSITORY.EVENT_MEDIA,
          useValue: mockRepository,
        },
        {
          provide: REPOSITORY.MEDIA_OBJECT,
          useValue: mockRepository,
        },
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
          },
        },
        {
          provide: REPOSITORY.EVENT_MEDIA,
          useValue: mockRepository,
        },
        {
          provide: REPOSITORY.MEDIA_OBJECT,
          useValue: mockRepository,
        },
        {
          provide: EventRepository,
          useValue: mockEventRepository,
        },
        {
          provide: QueueService,
          useValue: mockQueueService,
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: CONFIG_PROVIDER.REDIS_CLIENT,
          useValue: mockRedis,
        },
      ],
    }).compile();

    controller = module.get<EventController>(EventController);
    eventService = module.get<EventService>(EventService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(eventService).toBeDefined();
  });
});
