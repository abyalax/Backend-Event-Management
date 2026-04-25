import { Test, TestingModule } from '@nestjs/testing';
import { REPOSITORY } from '~/common/constants/database';
import { ConfigModule } from '~/infrastructure/config/config.module';
import { LoggerModule } from '~/common/logger/logger.module';
import { QueueModule } from '~/infrastructure/queue/queue.module';
import { EmailModule } from '~/infrastructure/email/email.module';
import { mockRepository } from '~/test/common/mock';
import { EventController } from './event.controller';
import { EventService } from './event.service';
import { EventRepository } from './event.repository';
import { QueueService } from '~/infrastructure/queue/queue.service';
import { EmailService } from '~/infrastructure/email/email.service';
import { PinoLogger } from 'nestjs-pino';
import { JwtModule } from '@nestjs/jwt';
import { CONFIG_SERVICE, ConfigService } from '~/infrastructure/config/config.provider';
import { StorageService } from '~/infrastructure/storage/storage.service';

describe('EventController', () => {
  let controller: EventController;
  let eventService: EventService;

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
      controllers: [EventController],
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
        {
          provide: REPOSITORY.EVENT_MEDIA,
          useValue: mockRepository,
        },
        {
          provide: REPOSITORY.MEDIA_OBJECT,
          useValue: mockRepository,
        },
        {
          provide: StorageService,
          useValue: {
            deleteFile: jest.fn(),
          },
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
