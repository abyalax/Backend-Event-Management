import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { Transaction } from './entities/transaction.entity';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PaymentExpiryCron } from './payment-expiry.cron';
import { PaymentWebhookProcessor } from './processors/payment-webhook.processor';
import { PaymentExpiryProcessor } from './processors/payment-expiry.processor';
import { EmailModule } from '~/infrastructure/email/email.module';
import { PAYMENT_QUEUE } from './payment.constant';
import { PaymentHealthIndicator } from './payment.health';
import { ConfigModule } from '~/infrastructure/config/config.module';
import { CONFIG_SERVICE, ConfigService } from '~/infrastructure/config/config.provider';
import { OrderModule } from '../orders/order.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction]),
    ConfigModule,
    EmailModule,
    ScheduleModule,
    BullModule.registerQueue({ name: PAYMENT_QUEUE }),
    forwardRef(() => OrderModule),
  ],
  controllers: [PaymentController],
  providers: [
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
  ],
  exports: [PaymentService, PaymentHealthIndicator],
})
export class PaymentModule {}
