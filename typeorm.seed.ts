import { configDotenv } from 'dotenv';
import { DataSource, type DataSourceOptions } from 'typeorm';
import type { SeederOptions } from 'typeorm-extension';
import { Permission } from '~/modules/auth/entity/permission.entity';
import { EventCategory } from '~/modules/event-categories/entity/event-category.entity';
import { Event } from '~/modules/events/entity/event.entity';
import { Notification } from '~/modules/notifications/entity/notification.entity';
import { OrderItem } from '~/modules/orders/entity/order-item.entity';
import { Order } from '~/modules/orders/entity/order.entity';
import { Payment } from '~/modules/payments/entities/payment.entity';
import { GeneratedEventTicket } from '~/modules/tickets/entities/generated-event-ticket.entity';
import { Ticket } from '~/modules/tickets/entities/ticket.entity';
import { User } from '~/modules/users/entity/user.entity';
import { RolePermission } from '~/modules/role-permissions/entity/role-permissions.entity';
import { MediaObject } from '~/infrastructure/storage/entitiy/media-objects.entity';
import { EventMedia } from '~/modules/events/entity/event-media.entity';
import { Role } from '~/modules/role-permissions/entity/role.entity';
import { Transaction } from '~/modules/payments/entities/transaction.entity';

configDotenv();

const dataSourceOptions: DataSourceOptions & SeederOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [
    EventCategory,
    Event,
    Ticket,
    Order,
    OrderItem,
    Payment,
    GeneratedEventTicket,
    Notification,
    User,
    Role,
    Permission,
    RolePermission,
    MediaObject,
    EventMedia,
    Transaction,
  ],
  synchronize: false,
  seeds: ['./src/infrastructure/database/seeds/*.seed.ts'],
  logging: true,
};

export const dataSource = new DataSource(dataSourceOptions);
