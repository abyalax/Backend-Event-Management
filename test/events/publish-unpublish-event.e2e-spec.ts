import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import z from 'zod';
import { validateSchema } from '~/common/helpers/validation';
import { QueryEventDto } from '~/modules/events/dto/query-event.dto';
import { Event } from '~/modules/events/entity/event.entity';
import { cleanupApplication, setupApplication } from '~/test/setup_e2e';
import { extractHttpOnlyCookie } from '~/test/utils';

const USER = {
  email: 'admin@gmail.com',
  password: 'password',
};

describe('Management Event Publication', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    [app, moduleFixture] = await setupApplication();
  });

  describe('Response Success', () => {
    let access_token: string;
    let refresh_token: string;

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

    test('GET /events + QueryEventDto - List All Events', async () => {
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

      // Verify event structure
      const events = res.body.data.data;
      if (events.length > 0) {
        const firstEvent = events[0];
        expect(firstEvent).toHaveProperty('id');
        expect(firstEvent).toHaveProperty('title');
        expect(firstEvent).toHaveProperty('location');
        expect(firstEvent).toHaveProperty('startDate');
        expect(firstEvent).toHaveProperty('endDate');
        expect(firstEvent).toHaveProperty('status');
        expect(firstEvent).toHaveProperty('categoryId');
        expect(firstEvent).toHaveProperty('createdBy');
      }

      // Verify meta structure
      const meta = res.body.data?.meta;
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

    test('POST /events/publish - Publish multiple events', async () => {
      // First, get all events to find unpublished ones
      const listRes = await request(app.getHttpServer())
        .get('/events')
        .query({ page: 1, limit: 10, status: 'PUBLISHED' })
        .set('Cookie', [`access_token=s:${access_token}`]);
      expect(listRes.status).toBe(200);

      const events: Event[] = listRes.body.data.data;
      if (events.length === 0) {
        console.log('No events found to test publish functionality');
        return;
      }

      // Take up to 3 unpublished events for testing
      const eventsToPublish = events.slice(0, 3);
      const eventIdsToPublish = eventsToPublish.map((event) => event.id);

      // Publish the events
      const publishRes = await request(app.getHttpServer())
        .post('/events/publish')
        .set('Cookie', [`access_token=s:${access_token}`])
        .send({ ids: eventIdsToPublish });

      expect(publishRes.status).toBe(200);
      expect(publishRes.body.message).toBe('publish events successfully');
      expect(publishRes.body.data).toHaveProperty('message');
      expect(publishRes.body.data).toHaveProperty('affected');
      expect(publishRes.body.data.affected).toBeGreaterThan(0);
      expect(publishRes.body.data.affected).toBeLessThanOrEqual(eventIdsToPublish.length);

      // Verify events are now published
      for (const eventId of eventIdsToPublish) {
        const eventRes = await request(app.getHttpServer())
          .get(`/events/${eventId}`)
          .set('Cookie', [`access_token=s:${access_token}`]);
        expect(eventRes.status).toBe(200);
        expect(eventRes.body.data.status).toBe('PUBLISHED');
      }
    });

    test('PATCH /events/:id - Unpublish events (update status to DRAFT)', async () => {
      // First, get all events to find published ones
      const listRes = await request(app.getHttpServer())
        .get('/events')
        .query({ page: 1, limit: 10, status: 'PUBLISHED' })
        .set('Cookie', [`access_token=s:${access_token}`]);
      expect(listRes.status).toBe(200);

      const events: Event[] = listRes.body.data.data;
      if (events.length === 0) {
        console.log('No events found to test unpublish functionality');
        return;
      }

      // Take up to 2 published events for testing
      const eventsToUnpublish = events.slice(0, 2);

      // Unpublish the events by updating status to DRAFT
      for (const event of eventsToUnpublish) {
        const updateRes = await request(app.getHttpServer())
          .patch(`/events/${event.id}`)
          .set('Cookie', [`access_token=s:${access_token}`])
          .send({ status: 'DRAFT' });

        expect(updateRes.status).toBe(204);
      }

      // Verify events are now unpublished
      for (const event of eventsToUnpublish) {
        const eventRes = await request(app.getHttpServer())
          .get(`/events/${event.id}`)
          .set('Cookie', [`access_token=s:${access_token}`]);
        expect(eventRes.status).toBe(200);
        expect(eventRes.body.data.status).toBe('DRAFT');
      }
    });

    test('POST /events/publish - Error handling for invalid event IDs', async () => {
      const invalidIds = ['invalid-uuid-1', 'invalid-uuid-2'];

      const publishRes = await request(app.getHttpServer())
        .post('/events/publish')
        .set('Cookie', [`access_token=s:${access_token}`])
        .send({ ids: invalidIds });

      expect(publishRes.status).toBe(400);
      expect(publishRes.body.message?.[0]).toBe('each value in ids must be a UUID');
    });

    test('POST /events/publish - Error handling for non-existent event IDs', async () => {
      const nonExistentIds = ['550e8400-e29b-41d4-a716-446655440999', '550e8400-e29b-41d4-a716-446655440888'];

      const publishRes = await request(app.getHttpServer())
        .post('/events/publish')
        .set('Cookie', [`access_token=s:${access_token}`])
        .send({ ids: nonExistentIds });

      expect(publishRes.status).toBe(404);
      expect(publishRes.body.message).toContain('Events not found');
    });

    test('POST /events/publish - Error handling for empty array', async () => {
      const publishRes = await request(app.getHttpServer())
        .post('/events/publish')
        .set('Cookie', [`access_token=s:${access_token}`])
        .send({ ids: [] });

      expect(publishRes.status).toBe(400);
      expect(publishRes.body.message).toContain('Event IDs are required');
    });
  });

  afterAll(async () => {
    await cleanupApplication(app, moduleFixture);
  });
});
