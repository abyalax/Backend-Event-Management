import { Provider } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { REPOSITORY } from '~/common/constants/database';
import { CONFIG_SERVICE, ConfigService } from '../config/config.provider';
import { CONFIG_PROVIDER } from '~/common/constants/provider';
import { PostgreeConnection } from '../database/database.provider';
import { Event } from '~/modules/events/entities/event.entity';
import { JobHandlerService } from './job-handler.service';
import { QueueErrorHandler } from './queue.error-handler';
import { QueueHealthIndicator } from './queue.health';
import { QueueService } from './queue.service';
import { GeneratedEventTicket } from '~/modules/tickets/entities/generated-event-ticket.entity';
import { User } from '~/modules/users/entities/user.entity';
import { PinoLogger } from 'nestjs-pino';

export const queueProvider: Provider[] = [
  PinoLogger,
  QueueService,
  QueueHealthIndicator,
  QueueErrorHandler,
  JobHandlerService,
  {
    provide: CONFIG_PROVIDER.QUEUE,
    inject: [CONFIG_SERVICE],
    useFactory: (configService: ConfigService) => ({
      redis: {
        host: configService.get('REDIS_HOST'),
        port: Number.parseInt(String(configService.get('REDIS_PORT') || '6379')),
        password: configService.get('REDIS_PASSWORD'),
      },
      concurrency: configService.get('QUEUE_CONCURRENCY') || 5,
    }),
  },
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
