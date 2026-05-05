import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { cleanupApplication, setupApplication } from '~/test/setup_e2e';
import { createOrder, fetchAvailableTicket, payOrderWithWebhook, waitForOrderReminders } from './tickets.utils';
import { loginAdmin } from '../common/auth';

describe('Paid Ticket Reminders Feature (e2e)', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;
  let accessToken: string;
  let eventId: string;
  let ticketId: string;
  let paidOrderId: string;
  let paidOrderAmount: number;

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

  test('creates reminders automatically when an order payment is confirmed', async () => {
    const order = await createOrder(app, accessToken, eventId, ticketId);
    paidOrderId = order.id;
    paidOrderAmount = order.totalAmount;

    await payOrderWithWebhook(app, paidOrderId, paidOrderAmount);

    const reminders = await waitForOrderReminders(app, accessToken, paidOrderId, 3);
    expect(reminders).toHaveLength(3);
    expect(reminders.every((item: { status: string }) => item.status === 'PENDING')).toBe(true);
    expect(reminders.some((item: { type: string }) => item.type === 'EMAIL')).toBe(true);
    expect(reminders.some((item: { type: string }) => item.type === 'NOTIFICATION')).toBe(true);
  });

  test('cancels all reminders for the paid order by endpoint', async () => {
    expect(paidOrderId).toBeDefined();

    await request(app.getHttpServer())
      .delete(`/reminders/order/${paidOrderId}`)
      .set('Cookie', [`access_token=s:${accessToken}`])
      .expect(204);

    const reminders = await waitForOrderReminders(app, accessToken, paidOrderId, 3);
    expect(reminders).toHaveLength(3);
    expect(reminders.every((item: { status: string }) => item.status === 'CANCELLED')).toBe(true);
  });
});
