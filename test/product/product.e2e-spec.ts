import { faker } from '@faker-js/faker/.';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import z from 'zod';
import { MetaResponseSchema } from '~/common/types/meta';
import type { CreateProductDto } from '~/modules/product/dto/create-product.dto';
import { QueryProductDto } from '~/modules/product/dto/query-product.dto';
import { Product } from '~/modules/product/entity/product.entity';
import { CategorySchema, EProductStatus, ProductSchema } from '~/modules/product/product.schema';
import { setupApplication } from '~/test/setup_e2e';
import { extractHttpOnlyCookie } from '~/test/utils';
import { validateSchema } from '../../src/common/helpers/validation';

const USER = {
  email: 'johnadmin@gmail.com',
  password: 'password',
};

describe('Module Product', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    [app, moduleFixture] = await setupApplication();
  });

  describe('Response Success', () => {
    let access_token: string;
    let refresh_token: string;
    let ids: number[] = [];
    let newProduct: Product | undefined;

    beforeEach(async () => {
      const credentials = {
        email: USER.email,
        password: USER.password,
      };
      const res = await request(app.getHttpServer()).post('/auth/login').send(credentials);

      expect(res.headers['set-cookie']).toBeDefined();
      const cookies = res.headers['set-cookie'];
      access_token = extractHttpOnlyCookie('access_token', cookies);
      refresh_token = extractHttpOnlyCookie('refresh_token', cookies);

      expect(refresh_token).toBeDefined();
      expect(access_token).toBeDefined();

      await request(app.getHttpServer())
        .get('/products/ids')
        .set('Cookie', `access_token=s%3A${encodeURIComponent(access_token)}`)
        .expect(200)
        .expect((res) => {
          ids = res.body.data;
          expect(ids).toBeDefined();
        });
    });

    test('GET /products + QueryProductDto', async () => {
      const query: QueryProductDto = { page: 1, per_page: 2 };
      const res = await request(app.getHttpServer())
        .get('/products')
        .query(query)
        .set('Cookie', `access_token=s%3A${encodeURIComponent(access_token)}`);

      const body = await res.body;
      const data = body.data.data[0];
      expect(data).toBeDefined();

      const meta = await res.body.data.meta;
      const validated = await validateSchema(MetaResponseSchema, meta);
      expect(validated).toBeDefined();
    });

    test('GET /products/categories', async () => {
      const res = await request(app.getHttpServer())
        .get('/products/categories')
        .set('Cookie', `access_token=s%3A${encodeURIComponent(access_token)}`);

      const data = await res.body.data[0];
      expect(data).toBeDefined();
    });

    test('GET /products/ids', async () => {
      const res = await request(app.getHttpServer())
        .get('/products/ids')
        .set('Cookie', `access_token=s%3A${encodeURIComponent(access_token)}`)
        .expect(200);

      const validData = await res.body.data;
      const schema = z.array(z.number());
      const result = await validateSchema(schema, validData);
      expect(result).toBeDefined();
    });

    test('GET /products/:id', async () => {
      const max = ids.length;
      const id = ids[Math.floor(Math.random() * max)];
      const res = await request(app.getHttpServer())
        .get(`/products/${id}`)
        .set('Cookie', `access_token=s%3A${encodeURIComponent(access_token)}`)
        .expect(200);

      const validData = await res.body.data;
      expect(validData).toBeDefined();
    });

    test('POST /products', async () => {
      let category: string = '';
      const max = ids.length;
      const id = ids[Math.floor(Math.random() * max)];
      const fetchProductByID = await request(app.getHttpServer())
        .get(`/products/${id}`)
        .set('Cookie', `access_token=s%3A${encodeURIComponent(access_token)}`)
        .expect(200);

      category = fetchProductByID.body.data.category.name;

      const price = parseInt(faker.commerce.price({ min: 5000, max: 1000000 }), 10);
      const product: CreateProductDto = {
        name: faker.commerce.productName(),
        price: price.toString(),
        status: EProductStatus.AVAILABLE,
        stock: faker.number.int({ min: 1, max: 230 }),
        category,
      };
      const res = await request(app.getHttpServer())
        .post('/products')
        .set('Cookie', `access_token=s%3A${encodeURIComponent(access_token)}`)
        .send(product);

      const data = await res.body.data;
      const validated = await validateSchema(ProductSchema, data);
      expect(validated).toBeDefined();
      newProduct = await res.body.data;
    });

    test('POST /products/categories', async () => {
      const category: string = faker.commerce.product();
      const res = await request(app.getHttpServer())
        .post('/products/categories')
        .set('Cookie', `access_token=s%3A${encodeURIComponent(access_token)}`)
        .send({ name: category })
        .expect(201);

      const data = await res.body.data;
      const validated = await validateSchema(CategorySchema, data);
      expect(validated).toBeDefined();
    });

    test('PATCH /products/:id', async () => {
      let category: string = '';
      const id = newProduct?.id;
      if (!id) {
        console.log('ID Product not found');
        return;
      }
      const fetchProductByID = await request(app.getHttpServer())
        .get(`/products/${id}`)
        .set('Cookie', `access_token=s%3A${encodeURIComponent(access_token)}`)
        .expect(200);
      category = fetchProductByID.body.data.category.name;

      const product = {
        id,
        name: faker.commerce.productName(),
        price: faker.commerce.price({ min: 5000, max: 1000000 }).toString(),
        status: EProductStatus.AVAILABLE,
        category,
      };
      await request(app.getHttpServer())
        .patch(`/products/${id}`)
        .set('Cookie', `access_token=s%3A${encodeURIComponent(access_token)}`)
        .send(product)
        .expect(HttpStatus.NO_CONTENT);
    });

    test('DELETE /products/:id', async () => {
      const id = newProduct?.id;
      if (!id) {
        console.log('ID Product not found');
        return;
      }
      await request(app.getHttpServer())
        .delete(`/products/${id}`)
        .set('Cookie', `access_token=s%3A${encodeURIComponent(access_token)}`)
        .expect(HttpStatus.NO_CONTENT);
    });
  });

  afterAll(async () => {
    await app.close();
    await moduleFixture.close();
  });
});
