import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { validateSchema } from '~/common/helpers/validation';
import { MetaResponseSchema } from '~/common/types/meta';
import { QueryUserDto } from '~/modules/user/dto/query-user.dto';
import { setupApplication } from '~/test/setup_e2e';
import { extractHttpOnlyCookie } from '~/test/utils';

const USER = {
  email: 'admin@gmail.com',
  password: 'password',
};

describe('Module User', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    [app, moduleFixture] = await setupApplication();
  });

  describe('Response Success', () => {
    let access_token: string;
    let refresh_token: string;

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
    });

    test('GET /users + QueryProductDto', async () => {
      const query: QueryUserDto = { page: 1, per_page: 2 };
      const res = await request(app.getHttpServer())
        .get('/users')
        .query(query)
        .set('Cookie', `access_token=s%3A${encodeURIComponent(access_token)}`);

      const body = await res.body;
      const data = body.data.data[0];
      expect(data).toBeDefined();

      const meta = await res.body.data.meta;

      const validated = await validateSchema(MetaResponseSchema, meta);
      expect(validated).toBeDefined();
    });

    /**

    test('GET /users/:id', async () => {
      const max = ids.length;
      const id = ids[Math.floor(Math.random() * max)];
      const res = await request(app.getHttpServer())
        .get(`/users/${id}`)
        .set('Cookie', `access_token=s%3A${encodeURIComponent(access_token)}`)
        .expect(200);

      const validData = await res.body.data;
      expect(validData).toBeDefined();
    });

    test('POST /users', async () => {
      let category: string = '';
      const max = ids.length;
      const id = ids[Math.floor(Math.random() * max)];
      const fetchProductByID = await request(app.getHttpServer())
        .get(`/users/${id}`)
        .set('Cookie', `access_token=s%3A${encodeURIComponent(access_token)}`)
        .expect(200);

      category = fetchProductByID.body.data.category.name;

      const price = Number.parseInt(faker.commerce.price({ min: 5000, max: 1000000 }), 10);
      const product: CreateProductDto = {
        name: faker.commerce.productName(),
        price: price.toString(),
        status: EProductStatus.AVAILABLE,
        stock: faker.number.int({ min: 1, max: 230 }),
        category,
      };
      const res = await request(app.getHttpServer())
        .post('/users')
        .set('Cookie', `access_token=s%3A${encodeURIComponent(access_token)}`)
        .send(product);

      const data = await res.body.data;
      const validated = await validateSchema(ProductSchema, data);
      expect(validated).toBeDefined();
      newProduct = await res.body.data;
    });

    test('PATCH /users/:id', async () => {
      let category: string = '';
      const id = newProduct?.id;
      if (!id) {
        return;
      }
      const fetchProductByID = await request(app.getHttpServer())
        .get(`/users/${id}`)
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
        .patch(`/users/${id}`)
        .set('Cookie', `access_token=s%3A${encodeURIComponent(access_token)}`)
        .send(product)
        .expect(HttpStatus.NO_CONTENT);
    });

    test('DELETE /users/:id', async () => {
      const id = newProduct?.id;
      if (!id) {
        return;
      }
      await request(app.getHttpServer())
        .delete(`/users/${id}`)
        .set('Cookie', `access_token=s%3A${encodeURIComponent(access_token)}`)
        .expect(HttpStatus.NO_CONTENT);
    });
 */
  });

  afterAll(async () => {
    await app.close();
    await moduleFixture.close();
  });
});
