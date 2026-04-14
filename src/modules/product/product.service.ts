import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { In, Repository } from 'typeorm';
import { REPOSITORY } from '~/common/constants/database';
import { DEFAULT } from '~/common/constants/default';
import { MetaResponse, Paginated } from '~/common/types/meta';
import { env } from '~/config/env';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Category } from './entity/category.entity';
import { Product } from './entity/product.entity';
import { OmitProduct } from './product.schema';

@Injectable()
export class ProductService {
  constructor(
    @Inject(REPOSITORY.PRODUCT)
    private readonly productRepository: Repository<Product>,

    @Inject(REPOSITORY.CATEGORY)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async getAll(): Promise<OmitProduct[]> {
    const products = await this.productRepository
      .createQueryBuilder('product')
      .leftJoin('product.category', 'category')
      .select([
        'product.name AS name',
        'product.barcode AS barcode',
        'product.price AS price',
        'product.cost_price AS cost_price',
        'product.tax_rate AS tax_rate',
        'product.discount AS discount',
        'product.status AS status',
        'category.name AS category',
      ])
      .getRawMany();

    return products;
  }

  /**
   * @title Search products at Page POS
   * @returns
   */
  async searchByName(query: { search: string }): Promise<Product[]> {
    const qb = this.productRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'c')
      .select([
        'p.id',
        'p.name',
        'p.barcode',
        'p.price',
        'p.cost_price',
        'p.tax_rate',
        'p.discount',
        'p.status',
        'p.created_at',
        'p.updated_at',
        'c.id',
        'c.name',
        'c.created_at',
        'c.updated_at',
      ])
      .limit(50);

    if (env.DATABASE_TYPE === 'postgres') {
      qb.andWhere('p.name ILIKE :search', { search: `%${query.search}%` });
    } else {
      // Fallback to LIKE for portability if MATCH not available
      qb.andWhere('p.name LIKE :search', { search: `%${query.search}%` });
    }

    return await qb.getMany();
  }

  /**
   * @title For Table Management Products
   * @param query QueryProduct (params untuk filtering dan pagination)
   * @returns Data paginated products
   */
  async find(query: QueryProductDto): Promise<Paginated<Product>> {
    const page = Number(query?.page ?? DEFAULT.PAGINATION.page);
    const per_page = Number(query?.per_page ?? DEFAULT.PAGINATION.per_page);
    const skip = (page - 1) * per_page;

    const allowedSortFields = ['name', 'price', 'status', 'created_at', 'updated_at'];
    const sort_by = allowedSortFields.includes(query?.sort_by ?? '') ? (query?.sort_by as string) : 'created_at';
    const sort_order: 'ASC' | 'DESC' = ['ASC', 'DESC'].includes(query?.sort_order ?? '') ? (query?.sort_order as 'ASC' | 'DESC') : 'DESC';

    const qb = this.productRepository.createQueryBuilder('p').leftJoinAndSelect('p.category', 'c');

    if (query?.search) {
      if (env.DATABASE_TYPE === 'postgres') qb.andWhere('p.name ILIKE :search', { search: `%${query.search}%` });
      else qb.andWhere('p.name LIKE :search', { search: `%${query.search}%` });
    }
    if (query?.status) qb.andWhere('p.status = :status', { status: query.status });
    if (query?.min_price) qb.andWhere('p.price >= :min_price', { min_price: query.min_price });
    if (query?.max_price) qb.andWhere('p.price <= :max_price', { max_price: query.max_price });
    if (query?.category) qb.andWhere('c.id = :category', { category: query.category });

    qb.orderBy(`p.${sort_by}`, sort_order).skip(skip).take(per_page);

    const [data, total_count] = await qb.getManyAndCount();
    const meta: MetaResponse = {
      page,
      per_page,
      total_count,
      total_pages: Math.ceil(total_count / per_page),
    };
    return { data, meta };
  }

  /**
   * @title get all category products to field select exist categories
   * @returns unique name categories with incluedes id
   */
  async getCategories(): Promise<Category[]> {
    // Return unique categories by name, preferring the lowest id
    const rows = await this.categoryRepository
      .createQueryBuilder('c')
      .select(['MIN(c.id) AS id', 'c.name AS name'])
      .groupBy('c.name')
      .getRawMany<{ id: number; name: string }>();

    const ids = rows.map((r) => Number(r.id));
    if (ids.length === 0) return [];
    const categories = await this.categoryRepository.findBy({ id: In(ids as unknown as number[]) });
    // Preserve order roughly by id
    const byId = new Map(categories.map((c) => [c.id, c]));
    return ids.reduce((acc, id) => {
      const category = byId.get(id);
      if (category) acc.push(category);
      return acc;
    }, [] as Category[]);
  }

  async getIds(): Promise<number[]> {
    const rows = await this.productRepository.find({ select: { id: true } });
    return rows.map((r) => Number(r.id));
  }

  async createCategory(category: CreateCategoryDto): Promise<Category> {
    return await this.categoryRepository.save({ name: category.name });
  }

  async create(payloadProduct: CreateProductDto): Promise<Product> {
    const category = await this.categoryRepository.findOneOrFail({ where: { name: payloadProduct.category } });
    const product = await this.productRepository.save({
      ...payloadProduct,
      category,
    });
    return product;
  }

  async findOneByID(id: number): Promise<Product> {
    const products = await this.productRepository.findOneBy({ id });
    if (products === null) throw new NotFoundException('Product not found');
    return products;
  }

  async update(id: number, payloadProduct: UpdateProductDto): Promise<boolean> {
    const category = await this.categoryRepository.findOneOrFail({ where: { name: payloadProduct.category } });
    const product = await this.productRepository.update(id, {
      ...payloadProduct,
      category,
    });
    if (product.affected === 0) throw new NotFoundException();
    return true;
  }

  async remove(id: number): Promise<boolean> {
    const product = await this.productRepository.delete(id);
    if (product.affected === 0) throw new NotFoundException();
    return true;
  }
}
