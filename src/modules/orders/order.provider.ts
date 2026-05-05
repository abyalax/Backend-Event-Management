import { Provider } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { REPOSITORY } from '~/common/constants/database';
import { CONFIG_SERVICE, ConfigService } from '~/infrastructure/config/config.provider';
import { CONFIG_PROVIDER } from '~/common/constants/provider';
import { PostgreeConnection } from '~/infrastructure/database/database.provider';
import { GeneratedEventTicket } from '~/modules/tickets/entities/generated-event-ticket.entity';
import { Event } from '~/modules/events/entities/event.entity';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { Payment } from '~/modules/payments/entities/payment.entity';
import { OrderExpirationWorker } from './workers/order-expiration.worker';
import { OrderProcessorWorker } from './workers/order-processor.worker';
import { OrderService } from './order.service';
import { PinoLogger } from 'nestjs-pino';

export const orderProvider: Provider[] = [
  PinoLogger,
  OrderService,
  OrderExpirationWorker,
  OrderProcessorWorker,
  {
    provide: CONFIG_PROVIDER.ORDER,
    inject: [CONFIG_SERVICE],
    useFactory: (configService: ConfigService) => ({
      urlApi: configService.get('URL_API'),
    }),
  },
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
