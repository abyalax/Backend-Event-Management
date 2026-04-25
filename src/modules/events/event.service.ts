import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { paginate, PaginateQuery } from 'nestjs-paginate';
import { REPOSITORY } from '~/common/constants/database';
import { EventCategory } from '../event-categories/entity/event-category.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Event } from './entity/event.entity';
import { EventMedia, EEventMediaType } from './entity/event-media.entity';
import { EventRepository } from './event.repository';
import { EVENT_PAGINATION_CONFIG } from './event-pagination.config';
import { QueueService } from '~/infrastructure/queue/queue.service';
import { PinoLogger } from 'nestjs-pino';
import { QUEUE } from '~/common/constants/queue';
import { MediaObject } from '~/infrastructure/storage/entitiy/media-objects.entity';
import { EAccessType } from '~/infrastructure/storage/dto/presigned-url.dto';
import { StorageService } from '~/infrastructure/storage/storage.service';
import { ConfigService, CONFIG_SERVICE } from '~/infrastructure/config/config.provider';

@Injectable()
export class EventService {
  constructor(
    @Inject(REPOSITORY.EVENT)
    private readonly eventRepository: Repository<Event>,

    @Inject(REPOSITORY.EVENT_CATEGORY)
    private readonly categoryRepository: Repository<EventCategory>,

    @Inject(REPOSITORY.EVENT_MEDIA)
    private readonly eventMediaRepository: Repository<EventMedia>,

    @Inject(REPOSITORY.MEDIA_OBJECT)
    private readonly mediaObjectRepository: Repository<MediaObject>,

    private readonly eventRepositoryCustom: EventRepository,
    private readonly queueService: QueueService,
    private readonly logger: PinoLogger,
    @Inject(CONFIG_SERVICE) private readonly configService: ConfigService,
    private readonly storageService: StorageService,
  ) {}

  async list(query: PaginateQuery) {
    const result = await paginate(query, this.eventRepository, EVENT_PAGINATION_CONFIG);

    // Manually load media relations for each event since pagination isn't loading them properly
    const eventsWithMedia = await Promise.all(
      result.data.map(async (event) => {
        // Load media relations manually
        const media = await this.eventMediaRepository.find({
          where: { eventId: event.id },
          relations: ['media'],
        });

        // Debug: Check if media relations are null
        if (media.length > 0 && media.some((m) => !m.media)) {
          console.log(`Event ${event.id}: Some media relations are null, loading manually`);
        }

        // Manually load media objects for each EventMedia if the relation is null
        for (const mediaItem of media) {
          if (!mediaItem.media && mediaItem.mediaId) {
            const mediaObject = await this.mediaObjectRepository.findOne({
              where: { id: mediaItem.mediaId },
            });
            if (mediaObject) {
              (mediaItem as any).media = mediaObject;
            }
          }
        }

        // Find banner media - treat undefined accessType as PUBLIC for testing
        const bannerMedia = media.find(
          (m) => m.type === EEventMediaType.BANNER && (m.media?.accessType === EAccessType.PUBLIC || m.media?.accessType === undefined),
        );
        const bannerUrl = bannerMedia?.media ? this.buildPublicUrl(bannerMedia.media) : null;

        return {
          ...event,
          media,
          bannerUrl,
        };
      }),
    );

    result.data = eventsWithMedia;
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

  async create(payloadEvent: CreateEventDto, userEmail: string): Promise<any> {
    const event = await this.eventRepositoryCustom.create(payloadEvent);

    // Load media relations and add bannerUrl
    const media = await this.eventMediaRepository.find({
      where: { eventId: event.id },
      relations: ['media'],
    });

    // Manually load media objects for each EventMedia if the relation is null
    for (const mediaItem of media) {
      if (!mediaItem.media && mediaItem.mediaId) {
        const mediaObject = await this.mediaObjectRepository.findOne({
          where: { id: mediaItem.mediaId },
        });
        if (mediaObject) {
          (mediaItem as any).media = mediaObject;
        }
      }
    }

    const bannerMedia = media.find(
      (m) => m.type === EEventMediaType.BANNER && (m.media?.accessType === EAccessType.PUBLIC || m.media?.accessType === undefined),
    );

    const bannerUrl = bannerMedia?.media ? this.buildPublicUrl(bannerMedia.media) : null;

    try {
      if (userEmail) {
        // Queue email notification job
        await this.queueService.addJob(QUEUE.EVENT_NOTIFICATIONS, 'send-event-creation-email', {
          eventId: event.id,
          userEmail: userEmail,
          eventTitle: event.title,
        });

        this.logger.info({ eventId: event.id, userEmail: userEmail, eventTitle: event.title }, 'Event creation email notification queued');
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
      media,
      bannerUrl,
    };
  }

  async findOneByID(id: string): Promise<any> {
    const event = await this.eventRepository.findOne({
      where: { id },
      relations: ['category', 'media', 'media.media'],
    });

    if (event === null) throw new NotFoundException('Event not found');

    // Add bannerUrl to the event
    const media = await this.eventMediaRepository.find({
      where: { eventId: event.id },
      relations: ['media'],
    });

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
    const existingEvent = await this.eventRepository.findOne({
      where: { id },
      relations: ['media', 'media.media'],
    });

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

    const Event = await this.eventRepository.update(id, {
      ...payloadEvent,
      categoryId: payloadEvent.categoryId?.toString(),
      category,
    });
    if (Event.affected === 0) throw new NotFoundException();
    return true;
  }

  async remove(id: string): Promise<boolean> {
    const Event = await this.eventRepository.softDelete(id);
    if (Event.affected === 0) throw new NotFoundException();
    return true;
  }
}
