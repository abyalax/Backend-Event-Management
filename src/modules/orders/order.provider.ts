import { Provider } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { REPOSITORY } from '~/common/constants/database';
import { PostgreeConnection } from '~/infrastructure/database/database.provider';
import { GeneratedEventTicket } from '~/modules/tickets/entities/generated-event-ticket.entity';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { Payment } from '~/modules/payments/entities/payment.entity';
import { Transaction } from '~/modules/payments/entities/transaction.entity';
import { OrderExpirationWorker } from './workers/order-expiration.worker';
import { OrderProcessorWorker } from './workers/order-processor.worker';
import { OrderService } from './order.service';
import { PinoLogger } from 'nestjs-pino';
import { TicketLockService } from '~/infrastructure/cache/ticket-lock.service';

export const orderProvider: Provider[] = [
  PinoLogger,
  OrderService,
  TicketLockService,
  OrderExpirationWorker,
  OrderProcessorWorker,
  {
    provide: REPOSITORY.ORDER,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Order),
    inject: [PostgreeConnection.provide],
  },
  {
    provide: REPOSITORY.ORDER_ITEM,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(OrderItem),
    inject: [PostgreeConnection.provide],
  },
  {
    provide: REPOSITORY.GENERATED_EVENT_TICKET,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(GeneratedEventTicket),
    inject: [PostgreeConnection.provide],
  },
  {
    provide: REPOSITORY.PAYMENT,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Payment),
    inject: [PostgreeConnection.provide],
  },
  {
    provide: REPOSITORY.TRANSACTION,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Transaction),
    inject: [PostgreeConnection.provide],
  },
];
