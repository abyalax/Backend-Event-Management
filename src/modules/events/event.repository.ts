import { Injectable, Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Event } from './entity/event.entity';
import { EventCategory } from '../event-categories/entity/event-category.entity';
import { EventMedia, EEventMediaType } from './entity/event-media.entity';
import { CONFIG_PROVIDER } from '~/common/constants/provider';
import { CreateEventDto } from './dto/create-event.dto';

@Injectable()
export class EventRepository {
  constructor(@Inject(CONFIG_PROVIDER.PSQL_CONNECTION) private readonly dataSource: DataSource) {}

  /**
   * Create event with banner upload in a transaction
   * If banner upload or relation creation fails, the entire operation is rolled back
   */
  async createWithBanner(payloadEvent: CreateEventDto): Promise<Event> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Verify category exists
      const category = await queryRunner.manager.findOne(EventCategory, {
        where: { id: Number(payloadEvent.categoryId) },
      });

      if (!category) throw new Error(`Category with ID ${payloadEvent.categoryId} not found`);

      // Create event
      const event = await queryRunner.manager.save(Event, {
        ...payloadEvent,
        categoryId: payloadEvent.categoryId.toString(),
        category,
      });

      // If banner media ID is provided, attach it to the event
      if (payloadEvent.bannerMediaId) {
        const eventMediaRepository = queryRunner.manager.getRepository(EventMedia);

        // Check if banner already exists and remove it (enforce single banner per event)
        const existingBanner = await eventMediaRepository.findOne({
          where: { eventId: event.id, type: EEventMediaType.BANNER },
        });

        if (existingBanner) await eventMediaRepository.remove(existingBanner);

        // Create new banner attachment
        await eventMediaRepository.save({
          eventId: event.id,
          mediaId: payloadEvent.bannerMediaId,
          type: EEventMediaType.BANNER,
          order: 0,
        });
      }

      await queryRunner.commitTransaction();
      return event;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Attach media to event in a transaction
   */
  async attachMedia(eventId: string, mediaId: string, type: EEventMediaType): Promise<EventMedia> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Verify event exists
      const event = await queryRunner.manager.findOne(Event, {
        where: { id: eventId },
      });

      if (!event) throw new Error(`Event with ID ${eventId} not found`);

      // For banner type, check if banner already exists and remove it
      if (type === EEventMediaType.BANNER) {
        const eventMediaRepository = queryRunner.manager.getRepository(EventMedia);
        const existingBanner = await eventMediaRepository.findOne({
          where: { eventId, type: EEventMediaType.BANNER },
        });

        if (existingBanner) await eventMediaRepository.remove(existingBanner);
      }

      // Create event media record
      const eventMediaRepository = queryRunner.manager.getRepository(EventMedia);
      const eventMedia = await eventMediaRepository.save({
        eventId,
        mediaId,
        type,
        order: 0,
      });

      await queryRunner.commitTransaction();
      return eventMedia;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
