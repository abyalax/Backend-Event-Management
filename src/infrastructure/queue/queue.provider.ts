import { Provider } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { REPOSITORY } from '~/common/constants/database';
import { PostgreeConnection } from '../database/database.provider';
import { Event } from '~/modules/events/entity/event.entity';
import { JobHandlerService } from './job-handler.service';
import { QueueErrorHandler } from './queue.error-handler';
import { QueueHealthIndicator } from './queue.health';
import { QueueService } from './queue.service';
import { GeneratedEventTicket } from '~/modules/tickets/entities/generated-event-ticket.entity';
import { User } from '~/modules/users/entity/user.entity';

export const queueProvider: Provider[] = [
  QueueService,
  QueueHealthIndicator,
  QueueErrorHandler,
  JobHandlerService,
  {
    provide: REPOSITORY.USER,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(User),
    inject: [PostgreeConnection.provide],
  },
  {
    provide: REPOSITORY.EVENT,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Event),
    inject: [PostgreeConnection.provide],
  },
  {
    provide: REPOSITORY.GENERATED_EVENT_TICKET,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(GeneratedEventTicket),
    inject: [PostgreeConnection.provide],
  },
];
