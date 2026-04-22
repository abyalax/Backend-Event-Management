import { configDotenv } from 'dotenv';
import { DataSource, type DataSourceOptions } from 'typeorm';
import type { SeederOptions } from 'typeorm-extension';
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

configDotenv();

const dataSourceOptions: DataSourceOptions & SeederOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [EventCategory, Event, Ticket, Order, OrderItem, Payment, GeneratedEventTicket, Notification, User, Role, Permission],
  synchronize: false,
  seeds: ['./src/infrastructure/database/seeds/*.seed.ts'],
  logging: true,
};

export const dataSource = new DataSource(dataSourceOptions);
