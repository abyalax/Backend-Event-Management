import { Provider } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { REPOSITORY } from '~/common/constants/database';
import { PostgreeConnection } from '~/infrastructure/database/database.provider';
import { Notification } from './entities/notification.entity';
import { NotificationService } from './notification.service';

export const notificationProvider: Provider[] = [
  NotificationService,
  {
    provide: REPOSITORY.NOTIFICATION,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Notification),
    inject: [PostgreeConnection.provide],
  },
];
