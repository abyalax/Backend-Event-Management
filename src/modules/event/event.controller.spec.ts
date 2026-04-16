import { JwtModule } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { REPOSITORY } from '~/common/constants/database';
import { env } from '~/config/env';
import { mockRepository } from '~/test/common/mock';
import { AuthModule } from '../auth/auth.module';
import { UserService } from '../user/user.service';
import { EventController } from './event.controller';
import { EventService } from './event.service';

describe('EventController', () => {
  let controller: EventController;
  let eventService: EventService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        AuthModule,
        JwtModule.register({
          secret: env.JWT_SECRET,
          privateKey: env.JWT_PRIVATE_KEY,
          publicKey: env.JWT_PUBLIC_KEY,
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
          provide: REPOSITORY.CATEGORY,
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

/**
describe('find', () => {
  it('should return LegacyPaginated events', async () => {
    const query: QueryEventDto = {
      page: 1,
      per_page: 10,
      search: 'test',
      status: 'active',
    };

    const mockLegacyPaginatedEvents = {
      data: [
        {
          id: 1,
          name: 'Test Event',
          price: 100,
          status: 'active',
        } as Event,
      ],
      meta: {
        page: 1,
        per_page: 10,
        total_count: 1,
        total_pages: 1,
      },
    };

    jest.spyOn(eventService, 'find').mockResolvedValue(mockLegacyPaginatedEvents);

    const result = await controller.find(query);

    expect(eventService.find).toHaveBeenCalledWith(query);
    expect(result).toEqual({
      statusCode: 200,
      data: mockLegacyPaginatedEvents,
    });
  });
});

describe('create', () => {
  it('should create a new event', async () => {
    const createEventDto: CreateEventDto = {
      name: 'New Event',
      price: 200,
      status: 'active',
      category: 'conference',
    };

    const mockEvent = {
      id: 2,
      name: 'New Event',
      price: 200,
      status: 'active',
    } as Event;

    jest.spyOn(eventService, 'create').mockResolvedValue(mockEvent);

    const result = await controller.create(createEventDto);

    expect(eventService.create).toHaveBeenCalledWith(createEventDto);
    expect(result).toEqual({
      statusCode: 201,
      data: mockEvent,
    });
  });
});

describe('getIds', () => {
  it('should return array of event IDs', async () => {
    const mockIds = [1, 2, 3];

    jest.spyOn(eventService, 'getIds').mockResolvedValue(mockIds);

    const result = await controller.getIdEvents();

    expect(eventService.getIds).toHaveBeenCalled();
    expect(result).toEqual({
      statusCode: 200,
      data: mockIds,
    });
  });
});

describe('findOneByID', () => {
  it('should return a single event by ID', async () => {
    const eventId = '1';
    const mockEvent = {
      id: 1,
      name: 'Test Event',
      price: 100,
      status: 'active',
    } as Event;

    jest.spyOn(eventService, 'findOneByID').mockResolvedValue(mockEvent);

    const result = await controller.findOneByID(eventId);

    expect(eventService.findOneByID).toHaveBeenCalledWith(eventId);
    expect(result).toEqual({
      statusCode: 200,
      data: mockEvent,
    });
  });
});

describe('update', () => {
  it('should update an event', async () => {
    const eventId = 1;
    const updateEventDto: UpdateEventDto = {
      name: 'Updated Event',
      price: 150,
      category: 'workshop',
    };

    jest.spyOn(eventService, 'update').mockResolvedValue(true);

    const result = await controller.update(eventId, updateEventDto);

    expect(eventService.update).toHaveBeenCalledWith(eventId, updateEventDto);
    expect(result).toEqual({
      statusCode: 204,
      data: true,
    });
  });
});

describe('remove', () => {
  it('should remove an event', async () => {
    const eventId = 1;

    jest.spyOn(eventService, 'remove').mockResolvedValue(true);

    const result = await controller.remove(eventId);

    expect(eventService.remove).toHaveBeenCalledWith(eventId);
    expect(result).toEqual({
      statusCode: 204,
      data: true,
    });
  });
});

 */
