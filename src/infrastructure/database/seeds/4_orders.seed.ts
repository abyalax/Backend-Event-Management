import type { DataSource } from 'typeorm';
import type { Seeder } from 'typeorm-extension';

import { Order } from '~/modules/order/entity/order.entity';

import { mockOrders } from '../mock/order.mock';

export default class OrderSeeder implements Seeder {
  track = true;

  public async run(dataSource: DataSource): Promise<void> {
    const orderRepo = dataSource.getRepository(Order);

    const orders = mockOrders();
    await orderRepo.insert(orders);
    console.log('Orders seeded successfully');
  }
}
