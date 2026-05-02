import type { DataSource } from 'typeorm';
import { REPOSITORY } from '~/common/constants/database';
import { PostgreeConnection } from '~/infrastructure/database/database.provider';
import { JwtGuard } from '~/common/guards/jwt.guard';
import { PermissionsGuard } from '~/common/guards/permission.guard';
import { CacheService } from '~/infrastructure/cache/cache.service';
import { RedisService } from '~/infrastructure/redis/redis.service';
import { Provider } from '@nestjs/common';
import { Order } from '../orders/entity/order.entity';
import { Payment } from '../payments/entities/payment.entity';
import { DashboardCacheService } from './dashboard-cache.service';
import { DashboardService } from './dashboard.service';
import { PinoLogger } from 'nestjs-pino';

export const dashboardProvider: Provider[] = [
  CacheService,
  RedisService,
  DashboardCacheService,
  DashboardService,
  PinoLogger,
  JwtGuard,
  PermissionsGuard,
  {
    provide: REPOSITORY.ORDER,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Order),
    inject: [PostgreeConnection.provide],
  },
  {
    provide: REPOSITORY.PAYMENT,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Payment),
    inject: [PostgreeConnection.provide],
  },
];
