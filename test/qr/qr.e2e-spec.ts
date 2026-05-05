import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { cleanupApplication, setupApplication } from '~/test/setup_e2e';
import { createOrder, fetchAvailableTicket, payOrderWithWebhook, waitForOrderTickets } from '../tickets/tickets.utils';
import { loginAdmin } from '../common/auth';

describe('Module QR', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;
  let accessToken: string;
  let eventId: string;
  let ticketId: string;
  let orderId: string;

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

  test('scans a QR code, revokes it, and rejects the revoked QR code', async () => {
    const order = await createOrder(app, accessToken, eventId, ticketId);
    orderId = order.id;

    await payOrderWithWebhook(app, orderId, order.totalAmount);

    const tickets = await waitForOrderTickets(app, accessToken, orderId);
    expect(Array.isArray(tickets)).toBe(true);
    expect(tickets.length).toBeGreaterThan(0);

    const generatedTicket = tickets[0] as {
      id: string;
      ticketId?: string;
      isUsed: boolean;
    };

    const generatedQrResponse = await request(app.getHttpServer())
      .post('/qr/generate')
      .send({
        ticketId: generatedTicket.id,
        eventId,
      })
      .expect(201);

    const qrCode = generatedQrResponse.body.qrCode as string;
    expect(qrCode).toBeDefined();

    const scanResponse = await request(app.getHttpServer()).post('/check-in').send({ qrCode }).expect(200);
    expect(scanResponse.body.status).toBe('VALID');
    expect(scanResponse.body.valid).toBe(true);
    expect(scanResponse.body.ticketId).toBe(generatedTicket.id);
    expect(scanResponse.body.eventId).toBe(eventId);

    const revokeResponse = await request(app.getHttpServer()).post('/qr/revoke').send({ qrCode }).expect(200);
    expect(revokeResponse.body.revoked).toBe(true);

    const revokedScanResponse = await request(app.getHttpServer()).post('/check-in').send({ qrCode }).expect(200);
    expect(revokedScanResponse.body.status).toBe('INVALID');
    expect(revokedScanResponse.body.valid).toBe(false);
  });
});
