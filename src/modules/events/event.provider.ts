import { Provider } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { REPOSITORY } from '~/common/constants/database';
import { PostgreeConnection } from '~/infrastructure/database/database.provider';
import { EventCategory } from '../event-categories/entities/event-category.entity';
import { Event } from './entities/event.entity';
import { EventMedia } from './entities/event-media.entity';
import { MediaObject } from '~/infrastructure/storage/entitiy/media-objects.entity';
import { EventService } from './event.service';
import { AttachMediaValidationPipe } from './pipes/attach-media-validation.pipe';
import { EventRepository } from './event.repository';

export const eventProvider: Provider[] = [
  EventService,
  AttachMediaValidationPipe,
  EventRepository,
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
