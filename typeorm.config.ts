import { configDotenv } from 'dotenv';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { Permission } from '~/modules/auth/entity/permission.entity';
import { Role } from '~/modules/roles/entity/role.entity';
import { EventCategory } from '~/modules/event-categories/entity/event-category.entity';
import { Event } from '~/modules/events/entity/event.entity';
import { Notification } from '~/modules/notifications/entity/notification.entity';
import { OrderItem } from '~/modules/orders/entity/order-item.entity';
import { Order } from '~/modules/orders/entity/order.entity';
import { Payment } from '~/modules/payments/entity/payment.entity';
import { GeneratedEventTicket } from '~/modules/tickets/entity/generated-event-ticket.entity';
import { Ticket } from '~/modules/tickets/entity/ticket.entity';
import { User } from '~/modules/users/entity/user.entity';
import { RolePermission } from '~/modules/role-permissions/entity/role-permissions.entity';
import { MediaObject } from '~/infrastructure/storage/entitiy/media-objects.entity';
import { EventMedia } from '~/modules/events/entity/event-media.entity';

configDotenv();

export const dataSource = new DataSource({
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
  ],
  migrations: [join(__dirname, '/migrations/**/*{.js,.ts}')],
  synchronize: false,
  migrationsRun: false,
  migrationsTableName: 'migrations',
  migrationsTransactionMode: 'all',
  logging: true,
});
