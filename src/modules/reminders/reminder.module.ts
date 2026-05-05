import { Module, OnModuleInit } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ReminderController } from './reminder.controller';
import { ReminderWorker } from './reminder.worker';
import { NotificationModule } from '../notifications/notification.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '~/infrastructure/database/database.module';
import { QueueModule } from '~/infrastructure/queue/queue.module';
import { EmailModule } from '~/infrastructure/email/email.module';
import { QueueService } from '~/infrastructure/queue/queue.service';
import { CONFIG_SERVICE, ConfigService } from '~/infrastructure/config/config.provider';
import { QUEUE } from '~/common/constants/queue';
import { reminderProvider } from './reminder.provider';

@Module({
  imports: [
    NotificationModule,
    DatabaseModule,
    QueueModule,
    EmailModule,
    AuthModule,
    JwtModule.registerAsync({
      inject: [CONFIG_SERVICE],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        privateKey: configService.get('JWT_PRIVATE_KEY'),
        publicKey: configService.get('JWT_PUBLIC_KEY'),
      }),
    }),
  ],
  controllers: [ReminderController],
  providers: reminderProvider,
  exports: [ReminderWorker, ...reminderProvider],
})
export class ReminderModule implements OnModuleInit {
  constructor(
    private readonly queueService: QueueService,
    private readonly reminderWorker: ReminderWorker,
  ) {}

  onModuleInit(): void {
    this.queueService.registerQueue(QUEUE.REMINDERS, this.reminderWorker.getJobConfigs());
  }
}
