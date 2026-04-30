import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { QueryEventDto } from '~/modules/events/dto/query-event.dto';
import { cleanupApplication, setupApplication } from '~/test/setup_e2e';
import { extractHttpOnlyCookie } from '~/test/utils';

const USER = {
  email: 'admin@gmail.com',
  password: 'password',
};

describe('Feature Names', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    [app, moduleFixture] = await setupApplication();
  });

  describe('Flow Feature', () => {
    let access_token: string;
    let refresh_token: string;
    let eventId: string;
    let ticketId: string;
    let orderId: string;

    beforeAll(async () => {
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

    test('GET /events - Get available events for testing', async () => {
      const query: QueryEventDto = { page: 1, limit: 10 };
      const res = await request(app.getHttpServer())
        .get('/events')
        .query(query)
        .set('Cookie', [`access_token=s:${access_token}`]);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('get data event successfully');
      expect(res.body.data).toBeDefined();
      expect(res.body.data.data).toBeDefined();
      expect(Array.isArray(res.body.data.data)).toBe(true);

      // Store event ID for later tests
      const events = res.body.data.data;
      if (events.length > 0) {
        eventId = events[0].id;
        expect(eventId).toBeDefined();
      }
    });
  });

  afterAll(async () => {
    await cleanupApplication(app, moduleFixture);
  });
});
