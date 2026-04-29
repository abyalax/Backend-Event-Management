import { Module, OnModuleInit } from '@nestjs/common';
import { DatabaseModule } from '~/infrastructure/database/database.module';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../users/user.module';
import { QueueModule } from '~/infrastructure/queue/queue.module';
import { EmailModule } from '~/infrastructure/email/email.module';
import { StorageModule } from '~/infrastructure/storage/storage.module';
import { EventController } from './event.controller';
import { eventProvider } from './event.provider';
import { QueueService } from '~/infrastructure/queue/queue.service';
import { EmailService } from '~/infrastructure/email/email.service';
import { PinoLogger } from 'nestjs-pino';
import { JwtModule } from '@nestjs/jwt';
import { CONFIG_SERVICE, ConfigService } from '~/infrastructure/config/config.provider';
import { QUEUE } from '~/common/constants/queue';
import { JOB } from '~/common/constants/job';
import { LoggerModule } from '~/common/logger/logger.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    UserModule,
    QueueModule,
    EmailModule,
    StorageModule,
    LoggerModule,
    JwtModule.registerAsync({
      inject: [CONFIG_SERVICE],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        privateKey: configService.get('JWT_PRIVATE_KEY'),
        publicKey: configService.get('JWT_PUBLIC_KEY'),
      }),
    }),
  ],
  providers: eventProvider,
  controllers: [EventController],
})
export class EventModule implements OnModuleInit {
  constructor(
    private readonly queueService: QueueService,
    private readonly emailService: EmailService,

    private readonly logger: PinoLogger,
  ) {}

  onModuleInit() {
    this.queueService.registerQueue(QUEUE.EVENT_NOTIFICATIONS, [
      {
        name: JOB.EVENT_SEND_CREATION_EMAIL,
        handler: async (data: { eventId: string; userEmail: string; eventTitle: string }) => {
          await this.sendEventCreationEmail(data);
        },
        options: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      },
    ]);
  }

  private async sendEventCreationEmail(data: { eventId: string; userEmail: string; eventTitle: string }) {
    try {
      const htmlContent = `
        <h2>Event Created Successfully!</h2>
        <p>Dear User,</p>
        <p>Your event "<strong>${data.eventTitle}</strong>" has been successfully created and will be published soon.</p>
        <p>Event ID: ${data.eventId}</p>
        <p>Thank you for using our event management system.</p>
        <br>
        <p>Best regards,<br>Event Management Team</p>
      `;

      await this.emailService.sendEmail({
        to: data.userEmail,
        subject: `Event Created: ${data.eventTitle}`,
        html: htmlContent,
        text: `Your event "${data.eventTitle}" has been successfully created and will be published soon.`,
      });

      this.logger.info({ eventId: data.eventId, userEmail: data.userEmail }, 'Event creation email sent successfully');
    } catch (error) {
      this.logger.error(
        { eventId: data.eventId, userEmail: data.userEmail, error: error instanceof Error ? error.message : 'Unknown error' },
        'Failed to send event creation email',
      );
      throw error;
    }
  }
}
