import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { paginate, PaginateQuery } from 'nestjs-paginate';
import { REPOSITORY } from '~/common/constants/database';
import { EventCategory } from '../event-categories/entities/event-category.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Event } from './entities/event.entity';
import { EventMedia, EEventMediaType } from './entities/event-media.entity';
import { EVENT_PAGINATION_CONFIG } from './event-pagination.config';
import { QueueService } from '~/infrastructure/queue/queue.service';
import { PinoLogger } from 'nestjs-pino';
import { QUEUE } from '~/common/constants/queue';
import { MediaObject } from '~/infrastructure/storage/entitiy/media-objects.entity';
import { EAccessType } from '~/infrastructure/storage/dto/presigned-url.dto';
import { StorageService } from '~/infrastructure/storage/storage.service';
import { ConfigService, CONFIG_SERVICE } from '~/infrastructure/config/config.provider';
import { EventRepository } from './event.repository';

@Injectable()
export class EventService {
  constructor(
    @Inject(REPOSITORY.EVENT_CATEGORY)
    private readonly categoryRepository: Repository<EventCategory>,

    @Inject(REPOSITORY.EVENT_MEDIA)
    private readonly eventMediaRepository: Repository<EventMedia>,

    @Inject(REPOSITORY.MEDIA_OBJECT)
    private readonly mediaObjectRepository: Repository<MediaObject>,

    @Inject(CONFIG_SERVICE) private readonly configService: ConfigService,
    private readonly storageService: StorageService,

    private readonly eventRepository: EventRepository,
    private readonly queueService: QueueService,
    private readonly logger: PinoLogger,
  ) {}

  async list(query: PaginateQuery) {
    const result = await paginate(query, this.eventRepository, EVENT_PAGINATION_CONFIG);

    // Process events to add bannerUrl
    const eventsWithBannerUrl = result.data.map((event) => {
      const bannerMedia = event.media?.find(
        (m) => m.type === EEventMediaType.BANNER && (m.media?.accessType === EAccessType.PUBLIC || m.media?.accessType === undefined),
      );
      const bannerUrl = bannerMedia?.media ? this.buildPublicUrl(bannerMedia.media) : null;

      return {
        ...event,
        bannerUrl,
      };
    });

    result.data = eventsWithBannerUrl;
    return result;
  }

  private buildPublicUrl(media: MediaObject): string {
    const minioUseSsl = this.configService.get('MINIO_USE_SSL');
    const minioEndpoint = this.configService.get('MINIO_ENDPOINT');
    const minioPort = this.configService.get('MINIO_PORT');

    const protocol = minioUseSsl ? 'https' : 'http';
    const endpoint = minioEndpoint;
    const port = minioPort;

    return `${protocol}://${endpoint}:${port}/${media.bucket}/${media.objectKey}`;
  }

  async create(payloadEvent: CreateEventDto, userEmail: string) {
    const category = await this.categoryRepository.findOne({
      where: { id: Number(payloadEvent.categoryId) },
    });

    if (!category) throw new NotFoundException(`Category with ID ${payloadEvent.categoryId} not found`);

    const event = await this.eventRepository.manager.transaction(async (manager) => {
      const createdEvent = await manager.save(Event, {
        ...payloadEvent,
        categoryId: String(payloadEvent.categoryId),
        category,
      });

      if (payloadEvent.bannerMediaId) {
        await manager.save(EventMedia, {
          eventId: createdEvent.id,
          mediaId: payloadEvent.bannerMediaId,
          type: EEventMediaType.BANNER,
          order: 0,
        });
      }

      return createdEvent;
    });

    const bannerMedia = payloadEvent.bannerMediaId
      ? await this.eventMediaRepository.findOne({
          where: {
            eventId: event.id,
            type: EEventMediaType.BANNER,
          },
          relations: ['media'],
        })
      : null;

    const banner = bannerMedia?.media;
    const canExposeBanner = banner?.accessType === EAccessType.PUBLIC || banner?.accessType === undefined;
    const bannerUrl = canExposeBanner ? this.buildPublicUrl(banner as MediaObject) : null;

    try {
      if (userEmail) {
        // Queue email notification job
        await this.queueService.addJob(QUEUE.EVENT_NOTIFICATIONS, 'send-event-creation-email', {
          eventId: event.id,
          userEmail,
          eventTitle: event.title,
        });

        this.logger.info({ eventId: event.id, userEmail, eventTitle: event.title }, 'Event creation email notification queued');
      } else {
        this.logger.warn({ eventId: event.id, createdBy: payloadEvent.createdBy }, 'User email not available for event creation notification');
      }
    } catch (error) {
      // Log error but don't fail the event creation
      this.logger.error(
        { eventId: event.id, error: error instanceof Error ? error.message : 'Unknown error' },
        'Failed to queue event creation email notification',
      );
    }

    return {
      ...event,
      bannerMedia,
      bannerUrl,
    };
  }

  async attachMedia(eventId: string, mediaId: string, type: EEventMediaType): Promise<EventMedia> {
    return this.eventRepository.manager.transaction(async (manager) => {
      const event = await manager.findOne(Event, {
        where: { id: eventId },
      });

      if (!event) throw new NotFoundException(`Event with ID ${eventId} not found`);

      if (type === EEventMediaType.BANNER) {
        await manager.delete(EventMedia, {
          eventId,
          type: EEventMediaType.BANNER,
        });
      }

      return manager.save(EventMedia, {
        eventId,
        mediaId,
        type,
        order: 0,
      });
    });
  }

  async findOneByID(id: string) {
    const event = await this.eventRepository.findDetailById(id);
    if (event === null) throw new NotFoundException('Event not found');

    const media = event.media ?? [];
    const bannerMedia = media.find(
      (m) => m.type === EEventMediaType.BANNER && (m.media?.accessType === EAccessType.PUBLIC || m.media?.accessType === undefined),
    );
    const bannerUrl = bannerMedia?.media ? this.buildPublicUrl(bannerMedia.media) : null;

    return {
      ...event,
      media,
      bannerUrl,
    };
  }

  async update(id: string, payloadEvent: UpdateEventDto): Promise<boolean> {
    // Find existing event with media relations
    const existingEvent = await this.eventRepository.findWithMediaById(id);
    if (!existingEvent) throw new NotFoundException('Event not found');

    // Handle banner media deletion if bannerMediaId is being updated
    if (payloadEvent.bannerMediaId && existingEvent.media) {
      const currentBanner = existingEvent.media.find((m) => m.type === EEventMediaType.BANNER);

      // If there's a current banner and it's different from the new one, delete the old banner from storage
      if (currentBanner && currentBanner.mediaId !== payloadEvent.bannerMediaId) {
        try {
          const oldMediaObject = await this.mediaObjectRepository.findOne({
            where: { id: currentBanner.mediaId },
          });

          if (oldMediaObject) {
            await this.storageService.deleteFile(oldMediaObject.bucket, oldMediaObject.objectKey);
            await this.mediaObjectRepository.remove(oldMediaObject);
            this.logger.info(`Deleted old banner media ${oldMediaObject.id} from storage`);
          }
        } catch (error) {
          this.logger.error(`Failed to delete old banner media: ${error instanceof Error ? error.message : 'Unknown error'}`);
          // Don't fail the update if storage deletion fails
        }
      }
    }

    // Handle category lookup - categoryId is a number from the DTO
    let category;
    if (payloadEvent.categoryId) {
      // Find category by numeric ID
      category = await this.categoryRepository.findOne({
        where: { id: payloadEvent.categoryId },
      });
      if (!category) throw new NotFoundException(`Category with ID ${payloadEvent.categoryId} not found`);
    }

    const updatedEvent = await this.eventRepository.update(id, {
      ...payloadEvent,
      categoryId: payloadEvent.categoryId?.toString(),
      category,
    });
    if (updatedEvent.affected === 0) throw new NotFoundException();
    return true;
  }

  async publish(ids: string[]) {
    if (!ids || ids.length === 0) throw new BadRequestException('Event IDs are required');

    // Check if events exist
    const missingIds = await this.eventRepository.findMissingIds(ids);
    if (missingIds.length > 0) throw new NotFoundException(`Events not found: ${missingIds.join(', ')}`);

    // Update events status to PUBLISHED
    const result = await this.eventRepository.update(
      ids.map((id) => ({ id })),
      { status: 'PUBLISHED' },
    );

    if (result.affected === 0) throw new NotFoundException('No events were updated');

    this.logger.info({ eventIds: ids, affected: result.affected }, 'Events published successfully');

    return {
      message: `Successfully published ${result.affected} events`,
      affected: result.affected || 0,
    };
  }

  async bulkDelete(ids: string[]) {
    if (!ids || ids.length === 0) throw new BadRequestException('Event IDs are required');
    const missingIds = await this.eventRepository.findMissingIds(ids);
    if (missingIds.length > 0) throw new NotFoundException(`Events not found: ${missingIds.join(', ')}`);

    // Soft delete events
    const result = await this.eventRepository.softDelete(ids);
    if (result.affected === 0) throw new NotFoundException('No events were deleted');
    this.logger.info({ eventIds: ids, affected: result.affected }, 'Events deleted successfully');

    return {
      message: `Successfully deleted ${result.affected} events`,
      affected: result.affected || 0,
    };
  }

  async delete(id: string) {
    const event = await this.eventRepository.findOne({ where: { id } });
    if (!event) throw new NotFoundException(`Event with ID ${id} not found`);

    const result = await this.eventRepository.softDelete([id]);
    if (!result.affected || result.affected === 0) throw new NotFoundException('Event was not deleted');

    this.logger.info({ eventId: id, affected: result.affected }, 'Event deleted successfully');

    return result.affected > 0;
  }
}
