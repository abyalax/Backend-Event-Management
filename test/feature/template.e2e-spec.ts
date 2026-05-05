import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { App } from 'supertest/types';
import { cleanupApplication, setupApplication } from '~/test/setup_e2e';
import { loginAdmin } from '../common/auth';

describe('Feature/Module Name', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    [app, moduleFixture] = await setupApplication();
  });

  describe('Flow Feature', () => {
    let access_token: string;

    beforeAll(async () => {
      const session = await loginAdmin(app);
      access_token = session.accessToken;

      expect(access_token).toBeDefined();
    });

    test('METHOD /ENDPOINT - Describe test case', async () => {});
  });

  afterAll(async () => {
    await cleanupApplication(app, moduleFixture);
  });
});
