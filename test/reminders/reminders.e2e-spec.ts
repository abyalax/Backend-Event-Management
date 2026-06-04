/* eslint-disable @typescript-eslint/no-unsafe-call */
import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { cleanupApplication, setupApplication } from '~/test/setup_e2e';
import { createOrder, fetchAvailableTicket } from '../tickets/tickets.utils';
import { loginAdmin } from '../common/auth';

describe('Reminders API (e2e)', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;
  let accessToken: string;
  let eventId: string;
  let ticketId: string;

  beforeAll(async () => {
    [app, moduleFixture] = await setupApplication();

    const session = await loginAdmin(app);
    accessToken = session.accessToken;

    const ticket = await fetchAvailableTicket(app, accessToken);
    eventId = ticket.eventId;
    ticketId = ticket.id;
  });

  afterAll(async () => {
    await cleanupApplication(app, moduleFixture);
  });

  describe('POST /reminders', () => {
    let reminderId: string;
    let orderId: string;

    beforeAll(async () => {
      const order = await createOrder(app, accessToken, eventId, ticketId);
      orderId = order.id;
    });

    afterAll(async () => {
      if (reminderId) {
        await request(app.getHttpServer())
          .delete(`/reminders/${reminderId}`)
          .set('Cookie', [`access_token=s:${accessToken}`])
          .expect(204);
      }

      if (orderId) {
        await request(app.getHttpServer())
          .post(`/orders/${orderId}/cancel`)
          .set('Cookie', [`access_token=s:${accessToken}`])
          .expect(200);
      }
    });

    it('creates a reminder for the current user and allows cancellation', async () => {
      const scheduledAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      const createResponse = await request(app.getHttpServer())
        .post('/reminders')
        .set('Cookie', [`access_token=s:${accessToken}`])
        .send({
          eventId,
          orderId,
          scheduledAt,
          type: 'EMAIL',
          subject: 'Manual reminder',
          message: 'This reminder was created through the API.',
        })
        .expect(201);

      reminderId = createResponse.body.id;
      expect(reminderId).toBeDefined();
      expect(createResponse.body.status).toBe('PENDING');
      expect(createResponse.body.eventId).toBe(eventId);
      expect(createResponse.body.orderId).toBe(orderId);

      const remindersResponse = await request(app.getHttpServer())
        .get('/reminders/my-reminders')
        .set('Cookie', [`access_token=s:${accessToken}`])
        .expect(200);

      const createdReminder = remindersResponse.body.find((item: { id: string }) => item.id === reminderId);
      expect(createdReminder).toBeDefined();
      expect(createdReminder.event.id).toBe(eventId);

      await request(app.getHttpServer())
        .delete(`/reminders/${reminderId}`)
        .set('Cookie', [`access_token=s:${accessToken}`])
        .expect(204);

      const cancelledResponse = await request(app.getHttpServer())
        .get('/reminders/my-reminders')
        .set('Cookie', [`access_token=s:${accessToken}`])
        .expect(200);

      const cancelledReminder = cancelledResponse.body.find((item: { id: string }) => item.id === reminderId);
      expect(cancelledReminder.status).toBe('CANCELLED');
    });
  });

  describe('POST /reminders/order/:orderId/schedule', () => {
    let orderId: string;

    beforeAll(async () => {
      const order = await createOrder(app, accessToken, eventId, ticketId);
      orderId = order.id;
    });

    afterAll(async () => {
      if (orderId) {
        await request(app.getHttpServer())
          .post(`/orders/${orderId}/cancel`)
          .set('Cookie', [`access_token=s:${accessToken}`])
          .expect(200);
      }
    });

    it('schedules reminders for a paid event order using the endpoint flow', async () => {
      await request(app.getHttpServer())
        .post(`/reminders/order/${orderId}/schedule`)
        .set('Cookie', [`access_token=s:${accessToken}`])
        .send({
          eventId,
        })
        .expect(201);

      const remindersResponse = await request(app.getHttpServer())
        .get('/reminders/my-reminders')
        .set('Cookie', [`access_token=s:${accessToken}`])
        .expect(200);

      const orderReminders = remindersResponse.body.filter((item: { orderId: string }) => item.orderId === orderId);
      expect(orderReminders).toHaveLength(3);
      expect(orderReminders.every((item: { status: string }) => item.status === 'PENDING')).toBe(true);
    });
  });
});
