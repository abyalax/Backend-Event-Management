import type { DataSource } from 'typeorm';
import { REPOSITORY } from '~/common/constants/database';
import { PostgreeConnection } from '~/infrastructure/database/database.provider';
import { Permission } from '../auth/entity/permission.entity';
import { User } from '../users/entity/user.entity';
import { Role } from './entity/role.entity';
import { JwtGuard } from '~/common/guards/jwt.guard';
import { PermissionsGuard } from '~/common/guards/permission.guard';
import { CacheService } from '~/infrastructure/cache/cache.service';
import { RedisService } from '~/infrastructure/redis/redis.service';
import { RoleCacheService } from './role-permission-cache.service';
import { RoleService } from './role-permission.service';

export const roleProvider = [
  CacheService,
  RedisService,
  RoleCacheService,
  RoleService,
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
