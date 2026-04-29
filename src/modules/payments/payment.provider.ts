import type { DataSource } from 'typeorm';
import { REPOSITORY } from '~/common/constants/database';
import { PostgreeConnection } from '~/infrastructure/database/database.provider';
import { Transaction } from './entities/transaction.entity';
import { PaymentExpiryCron } from './payment-expiry.cron';
import { PaymentWebhookProcessor } from './processors/payment-webhook.processor';
import { PaymentExpiryProcessor } from './processors/payment-expiry.processor';
import { PaymentHealthIndicator } from './payment.health';
import { CONFIG_SERVICE, ConfigService } from '~/infrastructure/config/config.provider';
import { PaymentService } from './payment.service';

export const paymentProvider = [
  PaymentService,
  PaymentWebhookProcessor,
  PaymentExpiryProcessor,
  PaymentExpiryCron,
  PaymentHealthIndicator,
  {
    provide: 'XENDIT_SECRET_KEY',
    inject: [CONFIG_SERVICE],
    useFactory: (config: ConfigService) => config.get('XENDIT_SECRET_KEY'),
  },
  {
    provide: REPOSITORY.TRANSACTION,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Transaction),
    inject: [PostgreeConnection.provide],
  },
];
