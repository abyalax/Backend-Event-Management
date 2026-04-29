import { Provider } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { REPOSITORY } from '~/common/constants/database';
import { PostgreeConnection } from '~/infrastructure/database/database.provider';
import { GeneratedEventTicket } from '~/modules/tickets/entities/generated-event-ticket.entity';
import { CheckInService } from './check-in.service';

export const checkInProviders: Provider[] = [
  CheckInService,
  {
    provide: REPOSITORY.GENERATED_EVENT_TICKET,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(GeneratedEventTicket),
    inject: [PostgreeConnection.provide],
  },
];
