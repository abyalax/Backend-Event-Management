import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { ADMIN } from '~/infrastructure/database/const/shared-data';
import { cleanupApplication, setupApplication } from '~/test/setup_e2e';
import { extractHttpOnlyCookie } from '~/test/utils';

describe('Feature Names', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    [app, moduleFixture] = await setupApplication();
  });

  describe('Flow Feature', () => {
    let access_token: string;
    let refresh_token: string;

    beforeAll(async () => {
      const credentials = {
        email: ADMIN.email,
        password: ADMIN.password,
      };
      const res = await request(app.getHttpServer()).post('/auth/login').send(credentials);

      expect(res.headers['set-cookie']).toBeDefined();
      const cookies = res.headers['set-cookie'];
      access_token = extractHttpOnlyCookie('access_token', cookies);
      refresh_token = extractHttpOnlyCookie('refresh_token', cookies);

      expect(refresh_token).toBeDefined();
      expect(access_token).toBeDefined();
    });

    test('METHOD /ENDPOINT - Describe test case', async () => {});
  });

  afterAll(async () => {
    await cleanupApplication(app, moduleFixture);
  });
});
