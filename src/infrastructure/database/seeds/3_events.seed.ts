import type { DataSource } from 'typeorm';
import type { Seeder } from 'typeorm-extension';

import { Event } from '~/modules/events/entities/event.entity';
import { EventMedia } from '~/modules/events/entities/event-media.entity';

import { EventCategory } from '~/modules/event-categories/entities/event-category.entity';
import { mockEventCategories } from '../mock/event-category.mock';
import { mockEvents } from '../mock/event.mock';
import { mockMediaObjects } from '../mock/media-object.mock';

export default class EventSeeder implements Seeder {
  track = true;

  public async run(dataSource: DataSource): Promise<void> {
    const eventRepo = dataSource.getRepository(Event);
    const categoryRepo = dataSource.getRepository(EventCategory);
    const eventMediaRepo = dataSource.getRepository(EventMedia);

    await categoryRepo.insert(mockEventCategories);
    console.log('Seeded: event categories successfully');

    const { events, eventMedia } = mockEvents(mockMediaObjects);
    await eventRepo.insert(events);
    console.log('Seeded: events successfully');

    await eventMediaRepo.insert(eventMedia);
    console.log('Seeded: event media relationships successfully');
  }
}
