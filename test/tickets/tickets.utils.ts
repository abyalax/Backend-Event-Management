import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { ADMIN } from '~/infrastructure/database/const/shared-data';

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
}

export interface EventSummary {
  id: string;
  startDate: string;
  title?: string;
  tickets?: TicketSummary[];
}

export interface TicketSummary {
  id: string;
  eventId: string;
  name?: string;
  price?: number;
  quota?: number;
  sold?: number;
  event?: {
    id: string;
    startDate: string;
  };
}

export interface OrderSummary {
  id: string;
  totalAmount: number;
  status: string;
}

export interface ReminderSummary {
  id: string;
  orderId: string;
  status: string;
  type: string;
  event?: {
    id: string;
  };
}

export const payOrderWithWebhook = async (app: INestApplication<App>, orderId: string, amount: number): Promise<void> => {
  const token = process.env.XENDIT_CALLBACK_TOKEN;

  if (!token) throw new Error('XENDIT_CALLBACK_TOKEN is not configured for tests');

  const response = await request(app.getHttpServer()).post('/payments/webhook/invoice').set('X-CALLBACK-TOKEN', token).send({
    id: orderId,
    external_id: orderId,
    status: 'PAID',
    amount,
    paid_amount: amount,
    paid_at: new Date().toISOString(),
    payment_method: 'INVOICE',
    payer_email: ADMIN.email,
    description: 'E2E order flow',
  });

  expect([200, 201]).toContain(response.status);

  await new Promise((resolve) => setTimeout(resolve, 1000));
};

export const fetchAvailableTicket = async (app: INestApplication<App>, accessToken: string): Promise<TicketSummary> => {
  const response = await request(app.getHttpServer())
    .get('/tickets')
    .query({ page: 1, limit: 100 })
    .set('Cookie', [`access_token=s:${accessToken}`]);

  expect(response.status).toBe(200);
  expect(response.body.data).toBeDefined();
  expect(Array.isArray(response.body.data.data)).toBe(true);

  const tickets: TicketSummary[] = response.body.data.data;
  const now = Date.now();
  const availableTicket = tickets.find(
    (ticket) =>
      Number(ticket.quota ?? 0) > Number(ticket.sold ?? 0) &&
      Number.isFinite(Date.parse(ticket.event?.startDate ?? '')) &&
      Date.parse(ticket.event?.startDate ?? '') > now,
  );

  if (!availableTicket) throw new Error('No available future ticket found for e2e test');

  return availableTicket;
};

export const pickAvailableTicket = (tickets: TicketSummary[]): TicketSummary => {
  const availableTicket = tickets.find((ticket) => Number(ticket.quota ?? 0) > Number(ticket.sold ?? 0));

  if (!availableTicket) throw new Error('No available ticket found for the selected event');

  return availableTicket;
};

export const createOrder = async (
  app: INestApplication<App>,
  accessToken: string,
  eventId: string,
  ticketId: string,
  quantity = 1,
): Promise<OrderSummary> => {
  const response = await request(app.getHttpServer())
    .post('/orders')
    .set('Cookie', [`access_token=s:${accessToken}`])
    .send({
      eventId,
      items: [
        {
          ticketId,
          quantity,
        },
      ],
      description: 'E2E order flow',
    });

  expect(response.status).toBe(201);
  expect(response.body.data).toBeDefined();
  return response.body.data as OrderSummary;
};

export const waitForOrderTickets = async (
  app: INestApplication<App>,
  accessToken: string,
  orderId: string,
  timeoutMs = 15000,
): Promise<unknown[]> => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const response = await request(app.getHttpServer())
      .get(`/orders/${orderId}/tickets`)
      .set('Cookie', [`access_token=s:${accessToken}`]);

    if (response.status === 200 && Array.isArray(response.body.data) && response.body.data.length > 0) {
      return response.body.data as unknown[];
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for tickets for order ${orderId}`);
};

export const waitForOrderReminders = async (
  app: INestApplication<App>,
  accessToken: string,
  orderId: string,
  expectedCount: number,
  timeoutMs = 10000,
): Promise<ReminderSummary[]> => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const response = await request(app.getHttpServer())
      .get('/reminders/my-reminders')
      .set('Cookie', [`access_token=s:${accessToken}`])
      .expect(200);

    const responseData = response.body as ReminderSummary[];
    const reminders = responseData.filter((item: ReminderSummary) => item.orderId === orderId);

    if (reminders.length >= expectedCount) return reminders;

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for ${expectedCount} reminders on order ${orderId}`);
};
