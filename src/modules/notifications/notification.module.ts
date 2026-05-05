import { Module } from '@nestjs/common';
import { DatabaseModule } from '~/infrastructure/database/database.module';
import { notificationProvider } from './notification.provider';

@Module({
  imports: [DatabaseModule],
  providers: notificationProvider,
  exports: notificationProvider,
})
export class NotificationModule {}
