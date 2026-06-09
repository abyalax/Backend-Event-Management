import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { REPOSITORY } from '~/common/constants/database';
import { CONFIG_SERVICE } from '~/infrastructure/config/config.provider';
import { CONFIG_PROVIDER } from '~/common/constants/provider';
import { mockRedis, mockRepository, mockStorageService, mockRedisService, mockQueueService, mockEventRepository } from '~/test/common/mock';
import { EventCategory } from '../event-categories/entities/event-category.entity';
import { Event } from './entities/event.entity';
import { EventService } from './event.service';
import { PinoLogger } from 'nestjs-pino';
import { JwtModule } from '@nestjs/jwt';
import { StorageService } from '~/infrastructure/storage/storage.service';
import { RedisService } from '~/infrastructure/redis/redis.service';
import { CacheService } from '~/infrastructure/cache/cache.service';
import { QueueService } from '~/infrastructure/queue/queue.service';
import { EventRepository } from './event.repository';

describe('EventService', () => {
  let service: EventService;
  let eventRepository: Repository<Event>;
  let categoryRepository: Repository<EventCategory>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'test-secret',
          privateKey: 'test-private-key',
          publicKey: 'test-public-key',
        }),
      ],
      providers: [
        EventService,
        {
          provide: CONFIG_PROVIDER.STORAGE,
          useValue: {
            buckets: {
              documents: 'documents',
              images: 'images',
              'images-public': 'images-public',
              'tickets-public': 'tickets-public',
              backups: 'backups',
              videos: 'videos',
            },
            maxFileSize: 52428800,
            allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
          },
        },
        {
          provide: CONFIG_SERVICE,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              const config = {
                URL_API: 'http://localhost:4000',
              };
              return config[key as keyof typeof config];
            }),
          },
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
          provide: REPOSITORY.EVENT_CATEGORY,
          useValue: mockRepository,
        },
        {
          provide: REPOSITORY.EVENT,
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
          provide: QueueService,
          useValue: mockQueueService,
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
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
          provide: EventRepository,
          useValue: mockEventRepository,
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

    service = module.get<EventService>(EventService);
    eventRepository = module.get<Repository<Event>>(REPOSITORY.EVENT);
    categoryRepository = module.get<Repository<EventCategory>>(REPOSITORY.EVENT_CATEGORY);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(eventRepository).toBeDefined();
    expect(categoryRepository).toBeDefined();
  });
});
