import { DataSource } from 'typeorm';
import type { Seeder } from 'typeorm-extension';
import { Category } from '~/modules/product/entity/category.entity';
import { Product } from '~/modules/product/entity/product.entity';
import { mockCategories, mockProducts } from '../mock/product.mock';

export default class ProductSeeder implements Seeder {
  track = true;
  public async run(dataSource: DataSource): Promise<void> {
    const repositoryCategory = dataSource.getRepository(Category);
    const repositoryProducts = dataSource.getRepository(Product);

    await repositoryCategory.insert(mockCategories);
    console.log('✅ Seeded: categories successfully');

    await repositoryProducts.save(mockProducts);
    console.log('✅ Seeded: products successfully');
  }
}
