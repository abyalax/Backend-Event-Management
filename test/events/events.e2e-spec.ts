import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import * as fs from 'node:fs';
import * as path from 'node:path';
import axios from 'axios';
import z from 'zod';
import { validateSchema } from '~/common/helpers/validation';
import { QueryEventDto } from '~/modules/events/dto/query-event.dto';
import { cleanupApplication, setupApplication } from '~/test/setup_e2e';
import { extractHttpOnlyCookie } from '~/test/utils';
import { EventDto } from '~/modules/events/dto/event.dto';

const USER = {
  email: 'admin@gmail.com',
  password: 'password',
};

describe('Module Events', () => {
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

    test('GET /events/public + QueryEventDto - Verify Public Events', async () => {
      const query: QueryEventDto = { page: 1, limit: 10, status: 'DRAFT' };
      const res = await request(app.getHttpServer()).get('/events/public').query(query);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('get public events successfully');
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

    test('GET /events + QueryEventDto - Verify Eager Loading', async () => {
      const query: QueryEventDto = { page: 1, limit: 10, status: 'DRAFT' };
      const res = await request(app.getHttpServer())
        .get('/events')
        .query(query)
        .set('Cookie', [`access_token=s:${access_token}`]);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('get data event successfully');
      expect(res.body.data).toBeDefined();
      expect(res.body.data.data).toBeDefined();
      expect(Array.isArray(res.body.data.data)).toBe(true);

      // Verify eager loading - check if category is loaded
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
        expect(firstEvent).toHaveProperty('category');

        // Verify category structure
        if (firstEvent.category) {
          expect(firstEvent.category).toHaveProperty('id');
          expect(firstEvent.category).toHaveProperty('name');
        }
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

    let createdEventId: string;

    test('POST /events (Create Event with Real Media)', async () => {
      // Step 1: Read the banner.jpg file
      const imagePath = path.join(process.cwd(), 'assets', 'banner.jpg');
      const imageBuffer = fs.readFileSync(imagePath);

      // Step 2: Get presigned URL
      const presignedPayload = {
        filename: 'banner.jpg',
        mimeType: 'image/jpeg',
        size: imageBuffer.length,
        accessType: 'public',
      };

      const presignedRes = await request(app.getHttpServer())
        .post('/media/presigned')
        .set('Cookie', [`access_token=s:${access_token}`])
        .send(presignedPayload);

      expect(presignedRes.status).toBe(201);
      expect(presignedRes.body.message).toBe('Presigned URL generated successfully');
      expect(presignedRes.body.data).toBeDefined();
      expect(presignedRes.body.data.mediaId).toBeDefined();
      expect(presignedRes.body.data.url).toBeDefined();

      const uploadUrl: string = presignedRes.body.data.url;
      const mediaId: string = presignedRes.body.data.mediaId;

      console.log('Using mediaId:', mediaId);

      // Step 3: Upload the image using PUT request with axios
      const uploadRes = await axios.put(uploadUrl, imageBuffer, {
        headers: {
          'Content-Type': 'image/jpeg',
        },
      });

      expect([200, 201, 204]).toContain(uploadRes.status);

      // Step 4: Confirm the upload was successful
      const confirmRes = await request(app.getHttpServer())
        .patch(`/media/${mediaId}/confirm`)
        .set('Cookie', [`access_token=s:${access_token}`])
        .send({ uploaded: true, actualSize: imageBuffer.length });

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.message).toBe('Media upload confirmed successfully');

      // Step 5: Verify media exists and check its accessType
      const mediaRes = await request(app.getHttpServer())
        .get(`/media/${mediaId}/url`)
        .set('Cookie', [`access_token=s:${access_token}`]);

      console.log('Media URL response:', JSON.stringify(mediaRes.body, null, 2));

      // Step 6: Create event with the uploaded media
      const payload = {
        title: 'Test Event with Real Banner',
        description: 'This is a test event with real uploaded banner',
        maxAttendees: 100,
        isVirtual: false,
        location: 'Test Location',
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        endDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // Day after tomorrow
        status: 'DRAFT',
        categoryId: 1, // Use numeric category ID from seeds
        createdBy: '550e8400-e29b-41d4-a716-446655440000', // Admin user ID
        bannerMediaId: mediaId, // Use real uploaded media ID
      };

      const res = await request(app.getHttpServer())
        .post('/events')
        .set('Cookie', [`access_token=s:${access_token}`])
        .send(payload);

      if (res.status !== 201) {
        console.log('Event creation failed:', res.status, res.body);
      }
      expect(res.status).toBe(201);
      expect(res.body.message).toBe('create data event successfully');
      expect(res.body.data).toBeDefined();
      expect(res.body.data.title).toBe(payload.title);

      createdEventId = res.body.data.id;

      // Verify bannerUrl exists and is properly formatted
      expect(res.body.data.bannerUrl).toBeDefined();
      expect(typeof res.body.data.bannerUrl).toBe('string');
      expect(res.body.data.bannerUrl).toMatch(/^https?:\/\/.+/);
    });

    test('GET /events/public - Verify bannerUrl exists for created event', async () => {
      // Create a new event with banner for this test
      const imagePath = path.join(process.cwd(), 'assets', 'banner.jpg');
      const imageBuffer = fs.readFileSync(imagePath);

      // Get presigned URL
      const presignedPayload = {
        filename: 'banner-public.jpg',
        mimeType: 'image/jpeg',
        size: imageBuffer.length,
        accessType: 'public',
      };

      const presignedRes = await request(app.getHttpServer())
        .post('/media/presigned')
        .set('Cookie', [`access_token=s:${access_token}`])
        .send(presignedPayload);

      expect(presignedRes.status).toBe(201);
      const uploadUrl: string = presignedRes.body.data.url;
      const mediaId = presignedRes.body.data.mediaId;

      // Upload the image
      const uploadRes = await axios.put(uploadUrl, imageBuffer, {
        headers: { 'Content-Type': 'image/jpeg' },
      });
      expect([200, 201, 204]).toContain(uploadRes.status);

      // Confirm upload
      const confirmRes = await request(app.getHttpServer())
        .patch(`/media/${mediaId}/confirm`)
        .set('Cookie', [`access_token=s:${access_token}`])
        .send({ uploaded: true, actualSize: imageBuffer.length });
      expect(confirmRes.status).toBe(200);

      // Create event
      const eventPayload = {
        title: 'Public Test Event with Banner',
        description: 'Test event for public endpoint',
        maxAttendees: 50,
        isVirtual: false,
        location: 'Public Test Location',
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        status: 'PUBLISHED',
        categoryId: 1,
        createdBy: '550e8400-e29b-41d4-a716-446655440000',
        bannerMediaId: mediaId,
      };

      const eventRes = await request(app.getHttpServer())
        .post('/events')
        .set('Cookie', [`access_token=s:${access_token}`])
        .send(eventPayload);
      expect(eventRes.status).toBe(201);

      const publicEventId = eventRes.body.data.id;

      // Test public endpoint
      const publicQuery: QueryEventDto = { page: 1, limit: 10 };
      const publicRes = await request(app.getHttpServer()).get('/events/public').query(publicQuery);

      expect(publicRes.status).toBe(200);
      expect(publicRes.body.data).toBeDefined();
      expect(publicRes.body.data.data).toBeDefined();
      expect(Array.isArray(publicRes.body.data.data)).toBe(true);

      // Find our created event in the list
      const publicEvents: EventDto[] = publicRes.body.data.data;
      console.log({ publicEvents: publicRes.body });

      const publicCreatedEvent = publicEvents.find((event) => event.id === publicEventId);

      if (publicCreatedEvent === undefined) throw new Error("Public event doesn't exist");

      expect(publicCreatedEvent).toBeDefined();
      expect(publicCreatedEvent.title).toBe('Public Test Event with Banner');

      // Verify bannerUrl exists and is properly formatted
      expect(publicCreatedEvent.bannerUrl).toBeDefined();
      expect(typeof publicCreatedEvent.bannerUrl).toBe('string');
      expect(publicCreatedEvent.bannerUrl).toMatch(/^https?:\/\/.+/);
    });

    test('GET /events/:id (Get Event By ID) - Verify Eager Loading', async () => {
      expect(createdEventId).toBeDefined();

      const res = await request(app.getHttpServer())
        .get(`/events/${createdEventId}`)
        .set('Cookie', [`access_token=s:${access_token}`]);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('get data event successfully');
      expect(res.body.data.id).toBe(createdEventId);

      // Verify eager loading - category should be loaded
      expect(res.body.data).toHaveProperty('category');
      if (res.body.data.category) {
        expect(res.body.data.category).toHaveProperty('id');
        expect(res.body.data.category).toHaveProperty('name');
      }
    });

    test('PATCH /events/:id (Update Event)', async () => {
      const updatePayload = {
        title: 'Test Event Updated',
        description: 'This is an updated test event',
      };

      const res = await request(app.getHttpServer())
        .patch(`/events/${createdEventId}`)
        .set('Cookie', [`access_token=s:${access_token}`])
        .send(updatePayload);

      expect(res.status).toBe(204);
      // 204 responses have no body
      expect(res.body).toEqual({});
    });

    test('POST /events/:id/media (Attach Media to Event)', async () => {
      const mediaPayload = {
        mediaId: '550e8400-e29b-41d4-a716-446655440003', // Assuming this exists
        type: 'banner',
      };

      const res = await request(app.getHttpServer())
        .post(`/events/${createdEventId}/media`)
        .set('Cookie', [`access_token=s:${access_token}`])
        .send(mediaPayload);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Media attached to event successfully');
      expect(res.body.data).toBeDefined();
    });

    test('DELETE /events/:id (Delete Event)', async () => {
      expect(createdEventId).toBeDefined();

      const res = await request(app.getHttpServer())
        .delete(`/events/${createdEventId}`)
        .set('Cookie', [`access_token=s:${access_token}`]);

      expect(res.status).toBe(204);
      // 204 responses have no body
      expect(res.body).toEqual({});
    });
  });

  afterAll(async () => {
    await cleanupApplication(app, moduleFixture);
  });
});
