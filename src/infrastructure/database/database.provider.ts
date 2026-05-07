import { DataSource, type DataSourceOptions } from 'typeorm';
import { Permission } from '~/modules/auth/entities/permission.entity';
import { Role } from '~/modules/role-permissions/entities/role.entity';
import { RolePermission } from '~/modules/role-permissions/entities/role-permissions.entity';
import { EventCategory } from '~/modules/event-categories/entities/event-category.entity';
import { Event } from '~/modules/events/entities/event.entity';
import { Notification } from '~/modules/notifications/entities/notification.entity';
import { EventReminder } from '~/modules/reminders/entities/event-reminder.entity';
import { OrderItem } from '~/modules/orders/entities/order-item.entity';
import { Order } from '~/modules/orders/entities/order.entity';
import { Payment } from '~/modules/payments/entities/payment.entity';
import { GeneratedEventTicket } from '~/modules/tickets/entities/generated-event-ticket.entity';
import { Ticket } from '~/modules/tickets/entities/ticket.entity';
import { User } from '~/modules/users/entities/user.entity';
import { CONFIG_SERVICE, ConfigService } from '../config/config.provider';
import { MediaObject } from '../storage/entitiy/media-objects.entity';
import { EventMedia } from '~/modules/events/entities/event-media.entity';
import { CONFIG_PROVIDER } from '~/common/constants/provider';
import { Transaction } from '~/modules/payments/entities/transaction.entity';

let dataSource: DataSource;

export const PostgreeConnection = {
  provide: CONFIG_PROVIDER.PSQL_CONNECTION,
  inject: [CONFIG_SERVICE],
  useFactory: async (configService: ConfigService) => {
    dataSource = new DataSource({
      type: 'postgres',
      url: configService.get('DATABASE_URL'),
      entities: [
        User,
        Role,
        Permission,
        RolePermission,
        Ticket,
        Event,
        Order,
        Payment,
        Notification,
        EventReminder,
        EventCategory,
        OrderItem,
        GeneratedEventTicket,
        MediaObject,
        EventMedia,
        Transaction,
      ],
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
