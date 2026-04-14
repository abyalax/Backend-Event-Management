import { DataSource, DataSourceOptions } from 'typeorm';
import { env } from '~/config/env';
import { Permission } from '~/modules/auth/entity/permission.entity';
import { Role } from '~/modules/auth/entity/role.entity';
import { Category } from '~/modules/product/entity/category.entity';
import { Product } from '~/modules/product/entity/product.entity';
import { User } from '~/modules/user/user.entity';

let dataSource: DataSource;

export const PostgreeConnection = {
  provide: 'psql_connection',
  inject: [],
  useFactory: async () => {
    dataSource = new DataSource({
      type: 'postgres',
      url: env.DATABASE_URL,
      entities: [Category, Product, User, Role, Permission],
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
