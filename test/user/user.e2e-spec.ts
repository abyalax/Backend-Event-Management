import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import z from 'zod';
import { validateSchema } from '~/common/helpers/validation';
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
      const query: QueryUserDto = { page: 1, limit: 2 };
      const res = await request(app.getHttpServer())
        .get('/users')
        .query(query)
        .set('Cookie', `access_token=s%3A${encodeURIComponent(access_token)}`);

      const body = await res.body;

      const data = body.data.data[0];
      expect(data).toBeDefined();

      const meta = await res.body.data.meta;

      const MetaResponseSchema = z.object({
        currentPage: z.number(),
        itemsPerPage: z.number(),
        totalItems: z.number(),
        totalPages: z.number(),
        sortBy: z.array(z.array(z.string())),
      });

      const validated = await validateSchema(MetaResponseSchema, meta);
      expect(validated).toBeDefined();
    });
  });

  afterAll(async () => {
    await app.close();
    await moduleFixture.close();
  });
});
