import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { TerminusModule } from '@nestjs/terminus';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { EmailModule } from '~/infrastructure/email/email.module';
import { PAYMENT_QUEUE } from './payment.constant';
import { PaymentHealthIndicator } from './payment.health';
import { ConfigModule } from '~/infrastructure/config/config.module';
import { OrderModule } from '../orders/order.module';
import { paymentProvider } from './payment.provider';
import { DatabaseModule } from '~/infrastructure/database/database.module';

@Module({
  imports: [
    ConfigModule,
    EmailModule,
    DatabaseModule,
    TerminusModule,
    ScheduleModule.forRoot(),
    BullModule.registerQueue({ name: PAYMENT_QUEUE }),
    forwardRef(() => OrderModule),
  ],
  controllers: [PaymentController],
  providers: paymentProvider,
  exports: [PaymentService, PaymentHealthIndicator],
})
export class PaymentModule {}
