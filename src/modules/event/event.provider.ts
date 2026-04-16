import { Provider } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { REPOSITORY } from '~/common/constants/database';
import { PostgreeConnection } from '~/infrastructure/database/database.provider';
import { EventCategory } from './entity/event-category.entity';
import { Event } from './entity/event.entity';

export const eventProvider: Provider[] = [
  {
    provide: REPOSITORY.EVENT,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Event),
    inject: [PostgreeConnection.provide],
  },
  {
    provide: REPOSITORY.EVENT_CATEGORY,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(EventCategory),
    inject: [PostgreeConnection.provide],
  },
];
