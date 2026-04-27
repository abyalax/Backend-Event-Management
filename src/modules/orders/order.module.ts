import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from '~/infrastructure/database/database.module';
import { TicketModule } from '../tickets/ticket.module';
import { PaymentModule } from '../payments/payment.module';
import { CONFIG_SERVICE, ConfigService } from '~/infrastructure/config/config.provider';
import { OrderController } from './order.controller';
import { orderProvider } from './order.provider';
import { OrderService } from './order.service';
import { OrderExpirationWorker } from './workers/order-expiration.worker';
import { OrderProcessorWorker } from './workers/order-processor.worker';

@Module({
  imports: [
    DatabaseModule,
    ScheduleModule,
    forwardRef(() => TicketModule),
    forwardRef(() => PaymentModule),
    JwtModule.registerAsync({
      inject: [CONFIG_SERVICE],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        privateKey: configService.get('JWT_PRIVATE_KEY'),
        publicKey: configService.get('JWT_PUBLIC_KEY'),
      }),
    }),
  ],
  providers: [...orderProvider, OrderService, OrderExpirationWorker, OrderProcessorWorker],
  controllers: [OrderController],
  exports: [OrderService, ...orderProvider],
})
export class OrderModule {}
