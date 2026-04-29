import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TerminusModule } from '@nestjs/terminus';
import { EmailService } from './email.service';
import { EmailProcessor } from './email.processor';
import { CONFIG_SERVICE, ConfigService } from '../config/config.provider';
import { CONFIG_PROVIDER } from '~/common/constants/provider';
import { MailPitHealthIndicator } from './email.health';
import { LoggerModule } from '~/common/logger/logger.module';
import { DatabaseModule } from '../database/database.module';
import { emailProviders } from './email.providers';

@Module({
  imports: [TerminusModule, BullModule.registerQueue({ name: 'email' }), LoggerModule, DatabaseModule],
  providers: [
    {
      provide: CONFIG_PROVIDER.EMAIL,
      inject: [CONFIG_SERVICE],
      useFactory: (configService: ConfigService) => {
        return {
          host: configService.get('MAILPIT_HOST'),
          port: configService.get('MAILPIT_PORT'),
          secure: false,
          requireTLS: false,
          auth: {
            user: configService.get('MAILPIT_USER'),
            pass: configService.get('MAILPIT_PASSWORD'),
          },
          from: configService.get('MAILPIT_FROM_EMAIL'),
          fromName: configService.get('MAILPIT_FROM_NAME'),
          tls: {
            rejectUnauthorized: false,
          },
        };
      },
    },
    EmailService,
    EmailProcessor,
    ...emailProviders,
    MailPitHealthIndicator,
  ],
  exports: [EmailService, MailPitHealthIndicator],
})
export class EmailModule {}
