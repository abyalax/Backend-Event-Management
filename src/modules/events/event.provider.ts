import { Provider } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { REPOSITORY } from '~/common/constants/database';
import { PostgreeConnection } from '~/infrastructure/database/database.provider';
import { EventCategory } from '../event-categories/entity/event-category.entity';
import { Event } from './entity/event.entity';
import { EventMedia } from './entity/event-media.entity';
import { MediaObject } from '~/infrastructure/storage/entitiy/media-objects.entity';

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
  {
    provide: REPOSITORY.EVENT_MEDIA,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(EventMedia),
    inject: [PostgreeConnection.provide],
  },
  {
    provide: REPOSITORY.MEDIA_OBJECT,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(MediaObject),
    inject: [PostgreeConnection.provide],
  },
];
