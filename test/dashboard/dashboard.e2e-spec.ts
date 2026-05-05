import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { cleanupApplication, setupApplication } from '~/test/setup_e2e';
import { loginAdmin } from '../common/auth';

describe('Module Dashboard', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    [app, moduleFixture] = await setupApplication();
  });

  describe('Feature Dashboard', () => {
    let access_token: string;

    beforeAll(async () => {
      const session = await loginAdmin(app);
      access_token = session.accessToken;

      expect(access_token).toBeDefined();
    });

    test('GET /dashboard/total-sales - Must accept and validate date range filters', async () => {
      // Test without date filters (should work)
      const resWithoutFilters = await request(app.getHttpServer())
        .get('/dashboard/total-sales')
        .set('Cookie', [`access_token=s:${access_token}`])
        .expect(200);

      expect(resWithoutFilters.body).toBeDefined();
      expect(typeof resWithoutFilters.body).toBe('object');

      // Test with valid date range
      const resWithDateRange = await request(app.getHttpServer())
        .get('/dashboard/total-sales')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        })
        .set('Cookie', [`access_token=s:${access_token}`])
        .expect(200);

      expect(resWithDateRange.body).toBeDefined();
      expect(typeof resWithDateRange.body).toBe('object');

      // Test with invalid date format should return 400
      await request(app.getHttpServer())
        .get('/dashboard/total-sales')
        .query({
          startDate: 'invalid-date',
          endDate: '2024-12-31',
        })
        .set('Cookie', [`access_token=s:${access_token}`])
        .expect(400);

      // Test with end date before start date should return 400
      await request(app.getHttpServer())
        .get('/dashboard/total-sales')
        .query({
          startDate: '2024-12-31',
          endDate: '2024-01-01',
        })
        .set('Cookie', [`access_token=s:${access_token}`])
        .expect(400);
    });

    test('GET /dashboard/top-events - Must accept and validate date range filters', async () => {
      // Test without date filters (should work)
      const resWithoutFilters = await request(app.getHttpServer())
        .get('/dashboard/top-events')
        .set('Cookie', [`access_token=s:${access_token}`])
        .expect(200);

      expect(resWithoutFilters.body).toBeDefined();
      expect(resWithoutFilters.body.data).toBeDefined();
      expect(Array.isArray(resWithoutFilters.body.data)).toBe(true);

      // Test with valid date range
      const resWithDateRange = await request(app.getHttpServer())
        .get('/dashboard/top-events')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        })
        .set('Cookie', [`access_token=s:${access_token}`])
        .expect(200);

      expect(resWithDateRange.body).toBeDefined();
      expect(resWithDateRange.body.data).toBeDefined();
      expect(Array.isArray(resWithDateRange.body.data)).toBe(true);

      // Test with invalid date format should return 400
      await request(app.getHttpServer())
        .get('/dashboard/top-events')
        .query({
          startDate: 'invalid-date',
          endDate: '2024-12-31',
        })
        .set('Cookie', [`access_token=s:${access_token}`])
        .expect(400);

      // Test with end date before start date should return 400
      await request(app.getHttpServer())
        .get('/dashboard/top-events')
        .query({
          startDate: '2024-12-31',
          endDate: '2024-01-01',
        })
        .set('Cookie', [`access_token=s:${access_token}`])
        .expect(400);
    });

    test('GET /dashboard/top-categories - Must accept and validate date range filters', async () => {
      // Test without date filters (should work)
      const resWithoutFilters = await request(app.getHttpServer())
        .get('/dashboard/top-categories')
        .set('Cookie', [`access_token=s:${access_token}`])
        .expect(200);

      expect(resWithoutFilters.body).toBeDefined();
      expect(resWithoutFilters.body.data).toBeDefined();
      expect(Array.isArray(resWithoutFilters.body.data)).toBe(true);

      // Test with valid date range
      const resWithDateRange = await request(app.getHttpServer())
        .get('/dashboard/top-categories')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        })
        .set('Cookie', [`access_token=s:${access_token}`])
        .expect(200);

      expect(resWithDateRange.body).toBeDefined();
      expect(resWithDateRange.body.data).toBeDefined();
      expect(Array.isArray(resWithDateRange.body.data)).toBe(true);

      // Test with invalid date format should return 400
      await request(app.getHttpServer())
        .get('/dashboard/top-categories')
        .query({
          startDate: 'invalid-date',
          endDate: '2024-12-31',
        })
        .set('Cookie', [`access_token=s:${access_token}`])
        .expect(400);

      // Test with end date before start date should return 400
      await request(app.getHttpServer())
        .get('/dashboard/top-categories')
        .query({
          startDate: '2024-12-31',
          endDate: '2024-01-01',
        })
        .set('Cookie', [`access_token=s:${access_token}`])
        .expect(400);
    });
  });

  afterAll(async () => {
    await cleanupApplication(app, moduleFixture);
  });
});
