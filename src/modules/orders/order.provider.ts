import { Provider } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { REPOSITORY } from '~/common/constants/database';
import { PostgreeConnection } from '~/infrastructure/database/database.provider';
import { GeneratedEventTicket } from '~/modules/tickets/entity/generated-event-ticket.entity';
import { Event } from '~/modules/events/entity/event.entity';
import { OrderItem } from './entity/order-item.entity';
import { Order } from './entity/order.entity';
import { Payment } from '~/modules/payments/entities/payment.entity';

export const orderProvider: Provider[] = [
  {
    provide: REPOSITORY.EVENT,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Event),
    inject: [PostgreeConnection.provide],
  },
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
];
