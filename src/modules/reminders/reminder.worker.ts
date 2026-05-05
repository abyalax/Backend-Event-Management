import { Injectable, OnModuleInit } from '@nestjs/common';
import { JobConfig } from '~/infrastructure/queue/queue.service';
import { ReminderService } from './reminder.service';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class ReminderWorker implements OnModuleInit {
  constructor(
    private readonly reminderService: ReminderService,
    private readonly logger: PinoLogger,
  ) {}

  onModuleInit() {
    this.logger.info('Reminder worker initialized');
  }

  getJobConfigs(): JobConfig[] {
    return [
      {
        name: 'send-reminder',
        handler: async (data: { reminderId: string }) => {
          await this.reminderService.processReminder(data.reminderId);
        },
        options: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 60000, // 1 minute
          },
          removeOnComplete: true,
          removeOnFail: true,
          timeout: 30000, // 30 seconds
        },
      },
    ];
  }
}
