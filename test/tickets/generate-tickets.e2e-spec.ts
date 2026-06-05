import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { cleanupApplication, setupApplication } from '~/test/setup_e2e';
import { createOrder, fetchAvailableTicket, payOrderWithWebhook, waitForOrderTickets } from './tickets.utils';
import { loginAdmin } from '../common/auth';
import { TResponse } from '~/common/types/response';
import { CheckInResponse } from '~/modules/check-in/check-in.interface';

describe('Module Ticket Generation', () => {
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

  test('creates tickets after payment and consumes QR code on check-in', async () => {
    const order = await createOrder(app, accessToken, eventId, ticketId);
    orderId = order.id;

    await payOrderWithWebhook(app, orderId, order.totalAmount);

    const tickets = await waitForOrderTickets(app, accessToken, orderId);
    expect(Array.isArray(tickets)).toBe(true);

    const generatedTicket = tickets[0] as {
      id: string;
      qrCodeUrl: string;
      pdfUrl: string;
      isUsed: boolean;
    };
    const qrCodePayload = generatedTicket.qrCodeUrl;

    expect(generatedTicket.id).toBeDefined();
    expect(generatedTicket.qrCodeUrl).toBeDefined();
    expect(generatedTicket.pdfUrl).toBeDefined();
    expect(generatedTicket.isUsed).toBe(false);

    const checkInResponse = await request(app.getHttpServer()).post('/check-in').send({ qrCode: qrCodePayload }).expect(200);
    const checkInResponseBody: TResponse<CheckInResponse> = checkInResponse.body;

    expect(checkInResponseBody.data?.status).toBe('VALID');
    expect(checkInResponseBody.data?.valid).toBe(true);
    expect(checkInResponseBody.data?.ticketId).toBe(generatedTicket.id);
    expect(checkInResponseBody.data?.eventId).toBe(eventId);

    const updatedTicketsResponse = await request(app.getHttpServer())
      .get(`/orders/${orderId}/tickets`)
      .set('Cookie', [`access_token=s:${accessToken}`])
      .expect(200);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const updatedTicket = updatedTicketsResponse.body.data.find((item: { id: string }) => item.id === generatedTicket.id);
    expect(updatedTicket.isUsed).toBe(true);

    const duplicateCheckInResponse = await request(app.getHttpServer()).post('/check-in').send({ qrCode: qrCodePayload }).expect(200);
    const duplicateCheckInResponseBody: TResponse<CheckInResponse> = duplicateCheckInResponse.body;

    expect(duplicateCheckInResponseBody.data?.status).toBe('ALREADY_USED');
    expect(duplicateCheckInResponseBody.data?.valid).toBe(false);

    const invalidCheckInResponse = await request(app.getHttpServer()).post('/check-in').send({ qrCode: 'invalid-qr-code-payload' }).expect(200);
    const invalidCheckInResponseBody: TResponse<CheckInResponse> = invalidCheckInResponse.body;

    expect(invalidCheckInResponseBody.data?.status).toBe('INVALID');
    expect(invalidCheckInResponseBody.data?.valid).toBe(false);
  });
});
