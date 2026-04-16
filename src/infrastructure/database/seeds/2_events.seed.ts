import type { DataSource } from 'typeorm';
import type { Seeder } from 'typeorm-extension';

import { EventCategory } from '~/modules/event/entity/event-category.entity';
import { Event } from '~/modules/event/entity/event.entity';

import { mockEvents } from '../mock/event.mock';

export default class EventSeeder implements Seeder {
  track = true;

  public async run(dataSource: DataSource): Promise<void> {
    const eventRepo = dataSource.getRepository(Event);
    const categoryRepo = dataSource.getRepository(EventCategory);

    await categoryRepo.insert([
      {
        id: 1,
        name: 'Conference',
        description: 'Large-scale professional conferences and summits',
      },
      {
        id: 2,
        name: 'Workshop',
        description: 'Hands-on learning sessions and skill development',
      },
      {
        id: 3,
        name: 'Technology',
        description: 'Tech-focused events and meetups',
      },
      {
        id: 4,
        name: 'Networking',
        description: 'Professional networking and social events',
      },
    ]);
    console.log('✅ Seeded: event categories successfully');

    // Seed events
    const events = mockEvents();
    await eventRepo.insert(events);
    console.log('✅ Seeded: events successfully');
  }
}
