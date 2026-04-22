import { Provider } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { REPOSITORY } from '~/common/constants/database';
import { PostgreeConnection } from '~/infrastructure/database/database.provider';
import { Ticket } from './entity/ticket.entity';

export const eventProvider: Provider[] = [
  {
    provide: REPOSITORY.TICKET,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Ticket),
    inject: [PostgreeConnection.provide],
  },
];
