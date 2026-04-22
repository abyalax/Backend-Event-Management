import type { DataSource } from 'typeorm';
import type { Seeder } from 'typeorm-extension';

import { Ticket } from '~/modules/tickets/entity/ticket.entity';

import { mockTickets } from '../mock/ticket.mock';

export default class TicketSeeder implements Seeder {
  track = true;

  public async run(dataSource: DataSource): Promise<void> {
    const ticketRepo = dataSource.getRepository(Ticket);

    const tickets = mockTickets();
    await ticketRepo.insert(tickets);
    console.log('Tickets seeded successfully');
  }
}
