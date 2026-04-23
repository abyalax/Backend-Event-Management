import { DataSource, type DataSourceOptions } from 'typeorm';
import { Permission } from '~/modules/auth/entity/permission.entity';
import { Role } from '~/modules/roles/entity/role.entity';
import { RolePermission } from '~/modules/role-permissions/entity/role-permissions.entity';
import { EventCategory } from '~/modules/event-categories/entity/event-category.entity';
import { Event } from '~/modules/events/entity/event.entity';
import { Notification } from '~/modules/notifications/entity/notification.entity';
import { OrderItem } from '~/modules/orders/entity/order-item.entity';
import { Order } from '~/modules/orders/entity/order.entity';
import { Payment } from '~/modules/payments/entity/payment.entity';
import { GeneratedEventTicket } from '~/modules/tickets/entity/generated-event-ticket.entity';
import { Ticket } from '~/modules/tickets/entity/ticket.entity';
import { User } from '~/modules/users/entity/user.entity';
import { CONFIG_SERVICE, ConfigService } from '../config/config.provider';
import { MediaObject } from '../storage/entitiy/media-objects.entity';
import { EventMedia } from '~/modules/events/entity/event-media.entity';
import { CONFIG_PROVIDER } from '~/common/constants/provider';

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
        EventCategory,
        OrderItem,
        GeneratedEventTicket,
        MediaObject,
        EventMedia,
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
