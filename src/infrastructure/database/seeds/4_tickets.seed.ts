import type { DataSource } from 'typeorm';
import type { Seeder } from 'typeorm-extension';
import { faker } from '@faker-js/faker';

import { Ticket } from '~/modules/tickets/entities/ticket.entity';
import { Event } from '~/modules/events/entity/event.entity';

export default class TicketSeeder implements Seeder {
  track = true;

  public async run(dataSource: DataSource): Promise<void> {
    const ticketRepo = dataSource.getRepository(Ticket);
    const eventRepo = dataSource.getRepository(Event);

    // Get existing events from database
    const events = await eventRepo.find();

    if (events.length === 0) {
      console.warn('No events found. Skipping ticket seeding.');
      return;
    }

    const tickets: Partial<Ticket>[] = [];
    const ticketTypes = ['General Admission', 'VIP', 'Early Bird', 'Student Pass'];

    // Generate tickets for each existing event
    events.forEach((event) => {
      const numTicketTypes = faker.number.int({ min: 1, max: 3 });
      const selectedTicketNames = faker.helpers.arrayElements(ticketTypes, numTicketTypes);

      selectedTicketNames.forEach((ticketName) => {
        const quota = faker.number.int({ min: 20, max: 100 });

        tickets.push({
          id: faker.string.uuid(),
          eventId: event.id, // Use actual event ID from database
          name: ticketName,
          price: ticketName === 'VIP' ? faker.number.int({ min: 500000, max: 1500000 }) : faker.number.int({ min: 50000, max: 450000 }),
          quota: quota,
          sold: faker.number.int({ min: 0, max: quota }),
        });
      });
    });

    await ticketRepo.insert(tickets);
    console.log(`Tickets seeded successfully: ${tickets.length} tickets created`);
  }
}
