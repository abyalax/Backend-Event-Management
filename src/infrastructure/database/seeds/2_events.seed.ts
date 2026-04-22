import type { DataSource } from 'typeorm';
import type { Seeder } from 'typeorm-extension';

import { Event } from '~/modules/events/entity/event.entity';

import { EventCategory } from '~/modules/event-categories/entity/event-category.entity';
import { mockEventCategories } from '../mock/event-category.mock';
import { mockEvents } from '../mock/event.mock';

export default class EventSeeder implements Seeder {
  track = true;

  public async run(dataSource: DataSource): Promise<void> {
    const eventRepo = dataSource.getRepository(Event);
    const categoryRepo = dataSource.getRepository(EventCategory);

    await categoryRepo.insert(mockEventCategories);
    console.log('✅ Seeded: event categories successfully');

    const events = mockEvents();
    await eventRepo.insert(events);
    console.log('✅ Seeded: events successfully');
  }
}
