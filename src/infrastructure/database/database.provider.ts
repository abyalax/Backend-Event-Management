import { DataSource, type DataSourceOptions } from 'typeorm';
import { Permission } from '~/modules/auth/entity/permission.entity';
import { Role } from '~/modules/auth/entity/role.entity';
import { EventCategory } from '~/modules/event-categories/entity/event-category.entity';
import { Event } from '~/modules/events/entity/event.entity';
import { Notification } from '~/modules/notifications/entity/notification.entity';
import { OrderItem } from '~/modules/orders/entity/order-item.entity';
import { Order } from '~/modules/orders/entity/order.entity';
import { Payment } from '~/modules/payments/entity/payment.entity';
import { GeneratedEventTicket } from '~/modules/ticket/entity/generated-event-ticket.entity';
import { Ticket } from '~/modules/ticket/entity/ticket.entity';
import { User } from '~/modules/user/entity/user.entity';
import { CONFIG_SERVICE, ConfigService } from '../config/config.provider';

let dataSource: DataSource;

export const PostgreeConnection = {
  provide: 'psql_connection',
  inject: [CONFIG_SERVICE],
  useFactory: async (configService: ConfigService) => {
    dataSource = new DataSource({
      type: 'postgres',
      url: configService.get('DATABASE_URL'),
      entities: [User, Role, Permission, Ticket, Event, Order, Payment, Notification, EventCategory, OrderItem, GeneratedEventTicket],
      synchronize: false,
    });
    return dataSource.initialize();
  },
};

export const closeConnection = async () => {
  if (dataSource?.isInitialized) await dataSource.destroy();
};

export const createDatabaseProviders = (provide: string, options: DataSourceOptions) => {
  return [
    {
      provide,
      useFactory: async () => {
        const dataSource = new DataSource(options);
        return dataSource.initialize();
      },
    },
  ];
};
