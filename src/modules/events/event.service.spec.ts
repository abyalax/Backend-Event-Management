import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { REPOSITORY } from '~/common/constants/database';
import { ConfigModule } from '~/infrastructure/config/config.module';
import { LoggerModule } from '~/common/logger/logger.module';
import { QueueModule } from '~/infrastructure/queue/queue.module';
import { EmailModule } from '~/infrastructure/email/email.module';
import { mockRepository } from '~/test/common/mock';
import { EventCategory } from '../event-categories/entity/event-category.entity';
import { Event } from './entity/event.entity';
import { EventRepository } from './event.repository';
import { EventService } from './event.service';
import { QueueService } from '~/infrastructure/queue/queue.service';
import { EmailService } from '~/infrastructure/email/email.service';
import { PinoLogger } from 'nestjs-pino';
import { JwtModule } from '@nestjs/jwt';
import { CONFIG_SERVICE, ConfigService } from '~/infrastructure/config/config.provider';

describe('EventService', () => {
  let service: EventService;
  let eventRepository: Repository<Event>;
  let categoryRepository: Repository<EventCategory>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule,
        LoggerModule,
        QueueModule,
        EmailModule,
        JwtModule.registerAsync({
          inject: [CONFIG_SERVICE],
          useFactory: (configService: ConfigService) => ({
            secret: configService.get('JWT_SECRET'),
            privateKey: configService.get('JWT_PRIVATE_KEY'),
            publicKey: configService.get('JWT_PUBLIC_KEY'),
          }),
        }),
      ],
      providers: [
        EventService,
        {
          provide: REPOSITORY.EVENT,
          useValue: mockRepository,
        },
        {
          provide: REPOSITORY.EVENT_CATEGORY,
          useValue: mockRepository,
        },
        {
          provide: EventRepository,
          useValue: {
            create: jest.fn(),
            attachMedia: jest.fn(),
          },
        },
        {
          provide: QueueService,
          useValue: {
            registerQueue: jest.fn(),
            addJob: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendEmail: jest.fn(),
          },
        },
        {
          provide: PinoLogger,
          useValue: {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
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
