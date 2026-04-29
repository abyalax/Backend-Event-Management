import type { DataSource } from 'typeorm';
import { REPOSITORY } from '~/common/constants/database';
import { PostgreeConnection } from '~/infrastructure/database/database.provider';
import { Permission } from '../auth/entity/permission.entity';
import { Role } from '../role-permissions/entity/role.entity';
import { User } from './entity/user.entity';
import { JwtGuard } from '~/common/guards/jwt.guard';
import { PermissionsGuard } from '~/common/guards/permission.guard';
import { CacheService } from '~/infrastructure/cache/cache.service';
import { RedisService } from '~/infrastructure/redis/redis.service';
import { UserCacheService } from './user-cache.service';
import { UserService } from './user.service';

export const userProvider = [
  CacheService,
  RedisService,
  UserCacheService,
  UserService,
  JwtGuard,
  PermissionsGuard,
  {
    provide: REPOSITORY.USER,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(User),
    inject: [PostgreeConnection.provide],
  },
  {
    provide: REPOSITORY.PERMISSION,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Permission),
    inject: [PostgreeConnection.provide],
  },
  {
    provide: REPOSITORY.ROLE,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Role),
    inject: [PostgreeConnection.provide],
  },
];
