import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { EmailService } from './email.service';
import { CONFIG_SERVICE, ConfigService } from '../config/config.provider';
import { CONFIG_PROVIDER } from '~/common/constants/provider';
import { MailPitHealthIndicator } from './indicators/health.indicator';

@Module({
  imports: [TerminusModule],
  providers: [
    {
      provide: CONFIG_PROVIDER.EMAIL,
      inject: [CONFIG_SERVICE],
      useFactory: (configService: ConfigService) => {
        const isDevelopment = configService.isDevelopment();
        return {
          host: configService.get('MAILPIT_HOST'),
          port: configService.get('MAILPIT_PORT'),
          secure: configService.get('MAILPIT_SECURE'),
          auth: isDevelopment
            ? undefined
            : {
                user: configService.get('MAILPIT_USER'),
                pass: configService.get('MAILPIT_PASSWORD'),
              },
          from: configService.get('MAILPIT_FROM_EMAIL'),
          fromName: configService.get('MAILPIT_FROM_NAME'),
        };
      },
    },
    EmailService,
    MailPitHealthIndicator,
  ],
  exports: [EmailService, MailPitHealthIndicator],
})
export class EmailModule {}
