import { Permission } from '~/modules/auth/entity/permission.entity';
import { Category } from '~/modules/product/entity/category.entity';
import { Product } from '~/modules/product/entity/product.entity';
import { Role } from '~/modules/auth/entity/role.entity';
import { DataSource, type DataSourceOptions } from 'typeorm';
import type { SeederOptions } from 'typeorm-extension';
import { User } from '~/modules/user/user.entity';
import { configDotenv } from 'dotenv';

configDotenv();

const dataSourceOptions: DataSourceOptions & SeederOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [Category, Product, User, Role, Permission],
  synchronize: false,
  seeds: ['./src/infrastructure/database/seeds/*.seed.ts'],
};

export const dataSource = new DataSource(dataSourceOptions);
