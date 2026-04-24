import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { paginate, PaginateQuery } from 'nestjs-paginate';
import { REPOSITORY } from '~/common/constants/database';
import { EventCategory } from '../event-categories/entity/event-category.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Event } from './entity/event.entity';
import { EventRepository } from './event.repository';
import { EVENT_PAGINATION_CONFIG } from './event-pagination.config';
import { QueueService } from '~/infrastructure/queue/queue.service';
import { PinoLogger } from 'nestjs-pino';
import { UserService } from '../users/user.service';

@Injectable()
export class EventService {
  constructor(
    @Inject(REPOSITORY.EVENT)
    private readonly eventRepository: Repository<Event>,

    @Inject(REPOSITORY.EVENT_CATEGORY)
    private readonly categoryRepository: Repository<EventCategory>,
    private readonly eventRepositoryCustom: EventRepository,
    private readonly queueService: QueueService,
    private readonly logger: PinoLogger,
    private readonly userService: UserService,
  ) {}

  async list(query: PaginateQuery) {
    return paginate(query, this.eventRepository, EVENT_PAGINATION_CONFIG);
  }

  async create(payloadEvent: CreateEventDto): Promise<Event> {
    const event = await this.eventRepositoryCustom.create(payloadEvent);

    try {
      // Get user information for email notification
      const user = await this.userService.findOne({ where: { id: payloadEvent.createdBy } });

      if (user?.email) {
        // Queue email notification job
        await this.queueService.addJob('event-notifications', 'send-event-creation-email', {
          eventId: event.id,
          userEmail: user.email,
          eventTitle: event.title,
        });

        this.logger.info({ eventId: event.id, userEmail: user.email, eventTitle: event.title }, 'Event creation email notification queued');
      } else {
        this.logger.warn(
          { eventId: event.id, createdBy: payloadEvent.createdBy },
          'User not found or email not available for event creation notification',
        );
      }
    } catch (error) {
      // Log error but don't fail the event creation
      this.logger.error(
        { eventId: event.id, error: error instanceof Error ? error.message : 'Unknown error' },
        'Failed to queue event creation email notification',
      );
    }

    return event;
  }

  async findOneByID(id: string): Promise<Event> {
    const Events = await this.eventRepository.findOneBy({ id });
    if (Events === null) throw new NotFoundException('Event not found');
    return Events;
  }

  async update(id: string, payloadEvent: UpdateEventDto): Promise<boolean> {
    const category = await this.categoryRepository.findOneOrFail({ where: { id: payloadEvent.categoryId } });
    const Event = await this.eventRepository.update(id, {
      ...payloadEvent,
      categoryId: payloadEvent.categoryId?.toString(),
      category,
    });
    if (Event.affected === 0) throw new NotFoundException();
    return true;
  }

  async remove(id: string): Promise<boolean> {
    const Event = await this.eventRepository.delete(id);
    if (Event.affected === 0) throw new NotFoundException();
    return true;
  }
}
