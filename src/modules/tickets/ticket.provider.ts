import { Provider } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { REPOSITORY } from '~/common/constants/database';
import { PostgreeConnection } from '~/infrastructure/database/database.provider';
import { Ticket } from './entities/ticket.entity';
import { TicketService } from './ticket.service';

export const eventProvider: Provider[] = [
  TicketService,
  {
    provide: REPOSITORY.TICKET,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Ticket),
    inject: [PostgreeConnection.provide],
  },
];
