import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { App } from 'supertest/types';
import { cleanupApplication, setupApplication } from './setup_e2e';
import { USER } from './common/constant';
import { extractHttpOnlyCookie } from './utils';

const USER_CREDENTIALS = {
  email: USER.LOGIN.email,
  password: USER.LOGIN.password,
};

describe('Ticket Payment E2E Test', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;
  let access_token: string;
  let mediaId: string;
  let eventId: string;
  let ticketId: string;
  let orderId: string;
  let testFilePath: string;

  beforeAll(async () => {
    [app, moduleFixture] = await setupApplication();

    // Setup test file path
    testFilePath = path.join(__dirname, '../assets/banner.jpg');
    if (!fs.existsSync(testFilePath)) {
      // Create a dummy test file if it doesn't exist
      const dummyDir = path.dirname(testFilePath);
      if (!fs.existsSync(dummyDir)) {
        fs.mkdirSync(dummyDir, { recursive: true });
      }
      fs.writeFileSync(testFilePath, Buffer.from('dummy test file content'));
    }

    // Login as admin
    const res = await request(app.getHttpServer()).post('/auth/login').send(USER_CREDENTIALS);

    expect(res.headers['set-cookie']).toBeDefined();
    const cookies = res.headers['set-cookie'];
    access_token = extractHttpOnlyCookie('access_token', cookies);
    expect(access_token).toBeDefined();
  });

  describe('Ticket Payment Flow', () => {
    test('POST /media/presigned - Generate presigned URL for media upload', async () => {
      const payload = {
        filename: 'banner.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        accessType: 'public',
      };

      const res = await request(app.getHttpServer())
        .post('/media/presigned')
        .set('Cookie', [`access_token=s:${access_token}`])
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Presigned URL generated successfully');
      expect(res.body.data).toHaveProperty('url');
      expect(res.body.data).toHaveProperty('mediaId');
      expect(res.body.data).toHaveProperty('objectKey');
      expect(res.body.data).toHaveProperty('bucket', 'images-public');
      expect(res.body.data).toHaveProperty('accessType', 'public');

      mediaId = res.body.data.mediaId;
      expect(mediaId).toBeDefined();

      // Upload file using presigned URL
      const uploadUrl: string = res.body.data.url;
      const fileBuffer = fs.readFileSync(testFilePath);

      // Use fetch for direct upload to MinIO
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'image/jpeg',
        },
        body: fileBuffer,
      });

      expect([200, 201]).toContain(uploadRes.status);
    });

    test('POST /events - Create event with banner', async () => {
      const payload = {
        title: 'Road Show Beasiswa KSE',
        description: 'Creating o Sustainable Future by KSE Scholarship',
        maxAttendees: 50,
        isVirtual: false,
        location: 'Jakarta - Gedung Purna Jaya',
        startDate: '2024-07-20T13:00:00.000Z',
        endDate: '2024-07-20T17:00:00.000Z',
        status: 'upcoming',
        categoryId: 2,
        createdBy: '550e8400-e29b-41d4-a716-446655440000',
        bannerMediaId: mediaId,
      };

      const res = await request(app.getHttpServer())
        .post('/events')
        .set('Cookie', [`access_token=s:${access_token}`])
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('create data event successfully');
      expect(res.body.data.title).toBe(payload.title);
      expect(res.body.data.bannerMediaId).toBe(mediaId);

      eventId = res.body.data.id;
      expect(eventId).toBeDefined();
    });

    test('POST /tickets - Create ticket for event', async () => {
      const payload = {
        name: 'Ticket Reguler',
        price: 75000,
        quota: 200,
        eventId: eventId,
      };

      const res = await request(app.getHttpServer())
        .post('/tickets')
        .set('Cookie', [`access_token=s:${access_token}`])
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('create ticket successfully');
      expect(res.body.data.name).toBe(payload.name);
      expect(res.body.data.price).toBe(payload.price);
      expect(res.body.data.eventId).toBe(eventId);

      ticketId = res.body.data.id;
      expect(ticketId).toBeDefined();
    });

    test('POST /orders/buy-ticket - Create order and buy ticket', async () => {
      const payload = {
        eventId: eventId,
        ticketId: ticketId,
        quantity: 1,
        description: 'Buy tickets gold for Road Show Beasiswa KSE',
        successRedirectUrl: 'http://localhost:3000/payment/success',
        failureRedirectUrl: 'http://localhost:3000/payment/failure',
      };

      const res = await request(app.getHttpServer())
        .post('/orders/buy-ticket')
        .set('Cookie', [`access_token=s:${access_token}`])
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('buy ticket succesfully');
      expect(res.body.data.totalAmount).toBe(75000);
      expect(res.body.data.status).toBe('PAID');
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].generatedTickets).toHaveLength(1);

      orderId = res.body.data.id;
      expect(orderId).toBeDefined();

      // Verify payment details
      expect(res.body.data.payment).toBeDefined();
      expect(res.body.data.payment.status).toBe('SETTLED');
      expect(res.body.data.payment.amount).toBe(75000);
    });

    test('POST /payments/webhook/invoice - Handle payment webhook simulation', async () => {
      const payload = {
        id: 'inv-000001',
        external_id: orderId,
        status: 'PAID',
        amount: '75000',
      };

      const callbackToken = process.env.XENDIT_CALLBACK_TOKEN || 'test-token';

      const res = await request(app.getHttpServer()).post('/payments/webhook/invoice').set('x-callback-token', callbackToken).send(payload);

      expect([200, 201]).toContain(res.status);
    });
  });

  afterAll(async () => {
    await cleanupApplication(app, moduleFixture);
  });
});
