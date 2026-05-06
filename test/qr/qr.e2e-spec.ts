import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { cleanupApplication, setupApplication } from '~/test/setup_e2e';
import { createOrder, fetchAvailableTicket, payOrderWithWebhook, waitForOrderTickets } from '../tickets/tickets.utils';
import { loginAdmin } from '../common/auth';

type GeneratedTicket = {
  id: string;
  qrCodeUrl: string;
  pdfUrl: string;
  isUsed: boolean;
};

const buildPdfTicketBuffer = async (qrCodePayload: string): Promise<Buffer> => {
  return Buffer.from(
    `%PDF-1.4
% Event Ticket
1 0 obj
<< /Type /Catalog >>
endobj
CHECKIN_QR:${qrCodePayload}
%%EOF`,
    'utf8',
  );
};

describe('Module QR Check-in', () => {
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

  const createPaidGeneratedTicket = async (): Promise<{ orderId: string; generatedTicket: GeneratedTicket }> => {
    const order = await createOrder(app, accessToken, eventId, ticketId);
    await payOrderWithWebhook(app, order.id, order.totalAmount);

    const tickets = await waitForOrderTickets(app, accessToken, order.id);
    expect(Array.isArray(tickets)).toBe(true);
    expect(tickets.length).toBeGreaterThan(0);

    const generatedTicket = tickets[0] as GeneratedTicket;
    expect(generatedTicket.id).toBeDefined();
    expect(generatedTicket.qrCodeUrl).toBeDefined();
    expect(generatedTicket.pdfUrl).toBeDefined();

    return {
      orderId: order.id,
      generatedTicket,
    };
  };

  test('validates QR code payload and rejects reused scan', async () => {
    const { generatedTicket } = await createPaidGeneratedTicket();

    const scanResponse = await request(app.getHttpServer()).post('/check-in').send({ qrCode: generatedTicket.qrCodeUrl }).expect(200);
    expect(scanResponse.body.data.status).toBe('VALID');
    expect(scanResponse.body.data.valid).toBe(true);
    expect(scanResponse.body.data.ticketId).toBe(generatedTicket.id);
    expect(scanResponse.body.data.eventId).toBe(eventId);

    const reusedScanResponse = await request(app.getHttpServer()).post('/check-in').send({ qrCode: generatedTicket.qrCodeUrl }).expect(200);
    expect(reusedScanResponse.body.data.status).toBe('ALREADY_USED');
    expect(reusedScanResponse.body.data.valid).toBe(false);
    expect(reusedScanResponse.body.data.ticketId).toBe(generatedTicket.id);
    expect(reusedScanResponse.body.data.eventId).toBe(eventId);
  });

  test('processes PDF ticket upload and rejects reused PDF', async () => {
    const { generatedTicket } = await createPaidGeneratedTicket();
    const pdfBuffer = await buildPdfTicketBuffer(generatedTicket.qrCodeUrl);

    const uploadResponse = await request(app.getHttpServer())
      .post('/check-in/pdf-upload')
      .attach('file', pdfBuffer, {
        filename: 'ticket.pdf',
        contentType: 'application/pdf',
      })
      .expect(200);

    expect(uploadResponse.body.data.status).toBe('VALID');
    expect(uploadResponse.body.data.valid).toBe(true);
    expect(uploadResponse.body.data.ticketId).toBe(generatedTicket.id);
    expect(uploadResponse.body.data.eventId).toBe(eventId);

    const reusedUploadResponse = await request(app.getHttpServer())
      .post('/check-in/pdf-upload')
      .attach('file', pdfBuffer, {
        filename: 'ticket.pdf',
        contentType: 'application/pdf',
      })
      .expect(200);

    expect(reusedUploadResponse.body.data.status).toBe('ALREADY_USED');
    expect(reusedUploadResponse.body.data.valid).toBe(false);
    expect(reusedUploadResponse.body.data.ticketId).toBe(generatedTicket.id);
    expect(reusedUploadResponse.body.data.eventId).toBe(eventId);
  });
});
