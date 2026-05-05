import { Provider } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { CONFIG_SERVICE, ConfigService } from '../config/config.provider';
import { CONFIG_PROVIDER } from '~/common/constants/provider';
import { EmailService } from './email.service';
import { REPOSITORY } from '~/common/constants/database';
import { DataSource } from 'typeorm';
import { GeneratedEventTicket } from '~/modules/tickets/entities/generated-event-ticket.entity';
import { PostgreeConnection } from '../database/database.provider';
import { MailPitHealthIndicator } from './email.health';
import { EmailProcessor } from './email.processor';

export const emailProvider: Provider[] = [
  PinoLogger,
  EmailService,
  MailPitHealthIndicator,
  EmailProcessor,
  {
    inject: [CONFIG_SERVICE],
    provide: CONFIG_PROVIDER.EMAIL,
    useFactory: (configService: ConfigService) => ({
      host: configService.get('MAILPIT_HOST'),
      port: Number.parseInt(configService.get('MAILPIT_PORT')),
      secure: configService.get('MAILPIT_SECURE') === 'true',
      auth: {
        user: configService.get('MAILPIT_USER'),
        pass: configService.get('MAILPIT_PASSWORD'),
      },
      from: configService.get('MAILPIT_FROM_EMAIL'),
      fromName: configService.get('MAILPIT_FROM_NAME'),
    }),
  },
  {
    provide: REPOSITORY.GENERATED_EVENT_TICKET,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(GeneratedEventTicket),
    inject: [PostgreeConnection.provide],
  },
];
