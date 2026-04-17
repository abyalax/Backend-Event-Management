import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { REPOSITORY } from '~/common/constants/database';
import { mockRepository } from '~/test/common/mock';
import { AuthModule } from '../auth/auth.module';
import { EventCategory } from '../event-category/entity/event-category.entity';
import { Event } from './entity/event.entity';
import { EventService } from './event.service';

describe('EventService', () => {
  let service: EventService;
  let eventRepository: Repository<Event>;
  let categoryRepository: Repository<EventCategory>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
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

/**
 describe('find', () => {
    it('should return LegacyPaginated events', async () => {
      const query: QueryEventDto = {
        page: 1,
        per_page: 10,
        search: 'test',
        status: 'active',
      };

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[{ id: 1, name: 'Test Event', price: 100, status: 'active' } as Event], 1]),
      };

      jest.spyOn(eventRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      const result = await service.find(query);

      expect(eventRepository.createQueryBuilder).toHaveBeenCalledWith('p');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('p.category', 'c');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(4);
      expect(mockQueryBuilder.orderBy).toHaveBeenCalled();
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
    });
  });

  describe('getIds', () => {
    it('should return array of event IDs', async () => {
      const mockEvents = [{ id: 1 }, { id: 2 }, { id: 3 }];

      jest.spyOn(eventRepository, 'find').mockResolvedValue(mockEvents as Event[]);

      const result = await service.getIds();

      expect(eventRepository.find).toHaveBeenCalledWith({ select: {} });
      expect(result).toEqual([1, 2, 3]);
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

      const mockCategory = { id: 1, name: 'conference' } as EventCategory;
      const mockCreatedEvent = { id: 1, name: 'New Event', price: 200, status: 'active' } as Event;

      jest.spyOn(categoryRepository, 'findOneOrFail').mockResolvedValue(mockCategory);
      jest.spyOn(eventRepository, 'save').mockResolvedValue(mockCreatedEvent);

      const result = await service.create(createEventDto);

      expect(categoryRepository.findOneOrFail).toHaveBeenCalledWith({ where: { name: 'conference' } });
      expect(eventRepository.save).toHaveBeenCalledWith({
        ...createEventDto,
        category: mockCategory,
      });
      expect(result).toEqual(mockCreatedEvent);
    });
  });

  describe('findOneByID', () => {
    it('should return a single event by ID', async () => {
      const eventId = '1';
      const mockEvent = { id: 1, name: 'Test Event', price: 100, status: 'active' } as Event;

      jest.spyOn(eventRepository, 'findOneBy').mockResolvedValue(mockEvent);

      const result = await service.findOneByID(eventId);

      expect(eventRepository.findOneBy).toHaveBeenCalledWith({ id: eventId });
      expect(result).toEqual(mockEvent);
    });

    it('should throw NotFoundException if event not found', async () => {
      const eventId = '999';

      jest.spyOn(eventRepository, 'findOneBy').mockResolvedValue(null);

      await expect(service.findOneByID(eventId)).rejects.toThrow(NotFoundException);
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

      const mockCategory = { id: 2, name: 'workshop' } as EventCategory;
      const mockUpdateResult = { affected: 1 };

      jest.spyOn(categoryRepository, 'findOneOrFail').mockResolvedValue(mockCategory);
      jest.spyOn(eventRepository, 'update').mockResolvedValue(mockUpdateResult as any);

      const result = await service.update(eventId, updateEventDto);

      expect(categoryRepository.findOneOrFail).toHaveBeenCalledWith({ where: { name: 'workshop' } });
      expect(eventRepository.update).toHaveBeenCalledWith(eventId, {
        ...updateEventDto,
        category: mockCategory,
      });
      expect(result).toBe(true);
    });

    it('should throw NotFoundException if event not found for update', async () => {
      const eventId = 999;
      const updateEventDto: UpdateEventDto = {
        name: 'Updated Event',
        price: 150,
        category: 'workshop',
      };

      const mockCategory = { id: 2, name: 'workshop' } as Category;
      const mockUpdateResult = { affected: 0 };

      jest.spyOn(categoryRepository, 'findOneOrFail').mockResolvedValue(mockCategory);
      jest.spyOn(eventRepository, 'update').mockResolvedValue(mockUpdateResult as any);

      await expect(service.update(eventId, updateEventDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove an event', async () => {
      const eventId = 1;
      const mockDeleteResult = { affected: 1 };

      jest.spyOn(eventRepository, 'delete').mockResolvedValue(mockDeleteResult as any);

      const result = await service.remove(eventId);

      expect(eventRepository.delete).toHaveBeenCalledWith(eventId);
      expect(result).toBe(true);
    });

    it('should throw NotFoundException if event not found for deletion', async () => {
      const eventId = 999;
      const mockDeleteResult = { affected: 0 };

      jest.spyOn(eventRepository, 'delete').mockResolvedValue(mockDeleteResult as any);

      await expect(service.remove(eventId)).rejects.toThrow(NotFoundException);
    });
  });
 */
