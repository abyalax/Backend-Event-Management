import { Test, TestingModule } from '@nestjs/testing';
import { REPOSITORY } from '~/common/constants/database';
import { ConfigModule } from '~/infrastructure/config/config.module';
import { LoggerModule } from '~/common/logger/logger.module';
import { mockRepository } from '~/test/common/mock';
import { UserService } from '../users/user.service';
import { EventController } from './event.controller';
import { EventService } from './event.service';
import { EventRepository } from './event.repository';

describe('EventController', () => {
  let controller: EventController;
  let eventService: EventService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule, LoggerModule],
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
        {
          provide: EventRepository,
          useValue: {
            createEventWithBanner: jest.fn(),
            createEventWithoutBanner: jest.fn(),
            updateEventWithBanner: jest.fn(),
            updateEventWithoutBanner: jest.fn(),
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
