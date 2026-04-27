import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from '~/infrastructure/database/database.module';
import { PaymentModule } from '../payments/payment.module';
import { OrderController } from './order.controller';
import { orderProvider } from './order.provider';
import { OrderService } from './order.service';
import { OrderExpirationWorker } from './workers/order-expiration.worker';
import { OrderProcessorWorker } from './workers/order-processor.worker';

@Module({
  imports: [DatabaseModule, ScheduleModule, forwardRef(() => PaymentModule)],
  providers: [...orderProvider, OrderService, OrderExpirationWorker, OrderProcessorWorker],
  controllers: [OrderController],
  exports: [OrderService, ...orderProvider],
})
export class OrderModule {}
