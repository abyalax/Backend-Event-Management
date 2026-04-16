import type { DataSource } from 'typeorm';
import { REPOSITORY } from '~/common/constants/database';
import { PostgreeConnection } from '~/infrastructure/database/database.provider';
import { Permission } from '../auth/entity/permission.entity';
import { Role } from '../auth/entity/role.entity';
import { User } from './entity/user.entity';

export const userProvider = [
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
