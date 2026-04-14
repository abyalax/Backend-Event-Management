import { Provider } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { REPOSITORY } from '~/common/constants/database';
import { PostgreeConnection } from '~/infrastructure/database/database.provider';
import { Category } from './entity/category.entity';
import { Product } from './entity/product.entity';

export const productProvider: Provider[] = [
  {
    provide: REPOSITORY.PRODUCT,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Product),
    inject: [PostgreeConnection.provide],
  },
  {
    provide: REPOSITORY.CATEGORY,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Category),
    inject: [PostgreeConnection.provide],
  },
];
