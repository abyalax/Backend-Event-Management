import type { DataSource } from 'typeorm';
import { REPOSITORY } from '~/common/constants/database';
import { PostgreeConnection } from '~/infrastructure/database/database.provider';
import { Transaction } from './entities/transaction.entity';

export const paymentProvider = [
  {
    provide: REPOSITORY.TRANSACTION,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Transaction),
    inject: [PostgreeConnection.provide],
  },
];
