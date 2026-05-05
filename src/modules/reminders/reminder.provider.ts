import { Provider } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { REPOSITORY } from '~/common/constants/database';
import { PostgreeConnection } from '~/infrastructure/database/database.provider';
import { ReminderService } from './reminder.service';
import { EventReminder } from './entities/event-reminder.entity';
import { Event } from '../events/entities/event.entity';
import { ReminderWorker } from './reminder.worker';

export const reminderProvider: Provider[] = [
  ReminderService,
  ReminderWorker,
  {
    provide: REPOSITORY.EVENT_REMINDER,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(EventReminder),
    inject: [PostgreeConnection.provide],
  },
  {
    provide: REPOSITORY.EVENT,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Event),
    inject: [PostgreeConnection.provide],
  },
];
