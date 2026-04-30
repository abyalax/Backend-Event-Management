import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { QueryEventDto } from '~/modules/events/dto/query-event.dto';
import { Ticket } from '~/modules/tickets/entities/ticket.entity';
import { cleanupApplication, setupApplication } from '~/test/setup_e2e';
import { extractHttpOnlyCookie } from '~/test/utils';

const USER = {
  email: 'admin@gmail.com',
  password: 'password',
};

describe('Module Ticket Generation', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    [app, moduleFixture] = await setupApplication();
  });

  describe('Ticket Generation Flow', () => {
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

    test('GET /events/:id/tickets - Get available tickets for event', async () => {
      expect(eventId).toBeDefined();

      const res = await request(app.getHttpServer())
        .get(`/events/${eventId}/tickets`)
        .set('Cookie', [`access_token=s:${access_token}`]);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('get data tickets successfully');
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);

      // Store ticket ID for later tests
      const tickets = res.body.data;
      if (tickets.length > 0) {
        ticketId = tickets[0].id;
        expect(ticketId).toBeDefined();
        expect(tickets[0]).toHaveProperty('id');
        expect(tickets[0]).toHaveProperty('name');
        expect(tickets[0]).toHaveProperty('price');
        expect(tickets[0]).toHaveProperty('quota');
      }
    });

    test('POST /orders - Create order for ticket purchase', async () => {
      expect(eventId).toBeDefined();
      expect(ticketId).toBeDefined();

      const orderData = {
        eventId: eventId,
        items: [
          {
            ticketId: ticketId,
            quantity: 1,
          },
        ],
        description: 'Test order for ticket generation',
      };

      const res = await request(app.getHttpServer())
        .post('/orders')
        .set('Cookie', [`access_token=s:${access_token}`])
        .send(orderData);

      expect(res.status).toBe(201);
      expect(res.body).toBeDefined();
      expect(res.body.id).toBeDefined();
      expect(res.body.status).toBeDefined();
      expect(res.body.totalAmount).toBeDefined();

      orderId = res.body.id;
      expect(orderId).toBeDefined();

      // Verify order structure
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('userId');
      expect(res.body).toHaveProperty('totalAmount');
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('items');
      expect(Array.isArray(res.body.items)).toBe(true);

      // Verify order item structure
      if (res.body.items.length > 0) {
        const orderItem = res.body.items[0];
        expect(orderItem).toHaveProperty('id');
        expect(orderItem).toHaveProperty('ticketId');
        expect(orderItem).toHaveProperty('quantity');
        expect(orderItem).toHaveProperty('price');
        expect(orderItem).toHaveProperty('subtotal');
      }
    });

    test('GET /orders/:id/status - Check order status', async () => {
      expect(orderId).toBeDefined();

      const res = await request(app.getHttpServer())
        .get(`/orders/${orderId}/status`)
        .set('Cookie', [`access_token=s:${access_token}`]);

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
      expect(res.body).toHaveProperty('orderId');
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('paymentStatus');
      expect(res.body.orderId).toBe(orderId);
    });

    test('POST /payments/invoice - Create payment invoice', async () => {
      expect(orderId).toBeDefined();

      const paymentData = {
        externalId: orderId,
        amount: 10000, // Sample amount
        payerEmail: USER.email,
        description: 'Test payment for ticket generation',
      };

      const res = await request(app.getHttpServer())
        .post('/payments/invoice')
        .set('Cookie', [`access_token=s:${access_token}`])
        .send(paymentData);

      expect(res.status).toBe(201);
      expect(res.body).toBeDefined();
      expect(res.body.id).toBeDefined();
      expect(res.body.status).toBeDefined();
      expect(res.body.paymentUrl).toBeDefined();
    });

    test('GET /orders/:id/tickets - Generate and retrieve tickets', async () => {
      expect(orderId).toBeDefined();

      // Wait a moment for payment processing simulation
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const res = await request(app.getHttpServer())
        .get(`/orders/${orderId}/tickets`)
        .set('Cookie', [`access_token=s:${access_token}`]);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      // Verify ticket structure
      if (res.body.length > 0) {
        const ticket = res.body[0];
        expect(ticket).toHaveProperty('id');
        expect(ticket).toHaveProperty('orderItemId');
        expect(ticket).toHaveProperty('ticketId');
        expect(ticket).toHaveProperty('qrCodeUrl');
        expect(ticket).toHaveProperty('pdfUrl');
        expect(ticket).toHaveProperty('isUsed');
        expect(ticket).toHaveProperty('issuedAt');

        // Verify QR code and PDF URLs are generated
        expect(ticket.qrCodeUrl).toBeDefined();
        expect(ticket.qrCodeUrl).not.toBe('pending');
        expect(ticket.pdfUrl).toBeDefined();
        expect(ticket.pdfUrl).not.toBe('pending');
        expect(ticket.isUsed).toBe(false);
        expect(ticket.issuedAt).toBeDefined();
      }
    });

    test('GET /orders/:id - Get complete order with tickets', async () => {
      expect(orderId).toBeDefined();

      const res = await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .set('Cookie', [`access_token=s:${access_token}`]);

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
      expect(res.body.id).toBe(orderId);

      // Verify order contains generated tickets
      if (res.body.items && res.body.items.length > 0) {
        const orderItem = res.body.items[0];
        if (orderItem.generatedTickets && orderItem.generatedTickets.length > 0) {
          const generatedTicket = orderItem.generatedTickets[0];
          expect(generatedTicket).toHaveProperty('id');
          expect(generatedTicket).toHaveProperty('qrCodeUrl');
          expect(generatedTicket).toHaveProperty('pdfUrl');
          expect(generatedTicket).toHaveProperty('isUsed');
          expect(generatedTicket).toHaveProperty('issuedAt');
        }
      }
    });

    test('POST /check-in - Test QR code validation (check-in)', async () => {
      expect(orderId).toBeDefined();

      // First get the tickets to have QR code data
      const ticketsRes = await request(app.getHttpServer())
        .get(`/orders/${orderId}/tickets`)
        .set('Cookie', [`access_token=s:${access_token}`]);

      expect(ticketsRes.status).toBe(200);
      expect(Array.isArray(ticketsRes.body)).toBe(true);

      if (ticketsRes.body.length > 0) {
        const ticket = ticketsRes.body[0];
        const qrCodePayload = ticket.qrCodeUrl;

        // Test check-in with QR code
        const checkInRes = await request(app.getHttpServer()).post('/check-in').send({ qrCode: qrCodePayload });

        expect(checkInRes.status).toBe(200);
        expect(checkInRes.body).toBeDefined();
        expect(checkInRes.body).toHaveProperty('valid');
        expect(checkInRes.body).toHaveProperty('ticketId');
        expect(checkInRes.body).toHaveProperty('eventId');
        expect(checkInRes.body.valid).toBe(true);
        expect(checkInRes.body.ticketId).toBe(ticket.id);

        // Verify ticket is now marked as used
        const updatedTicketsRes = await request(app.getHttpServer())
          .get(`/orders/${orderId}/tickets`)
          .set('Cookie', [`access_token=s:${access_token}`]);

        expect(updatedTicketsRes.status).toBe(200);
        const tickets: Ticket[] = updatedTicketsRes.body;
        const updatedTicket = tickets.find((t: { id: string }) => t.id === ticket.id);
        expect(updatedTicket?.isUsed).toBe(true);
      }
    });

    test('POST /check-in - Test duplicate check-in should fail', async () => {
      expect(orderId).toBeDefined();

      // Get the tickets again
      const ticketsRes = await request(app.getHttpServer())
        .get(`/orders/${orderId}/tickets`)
        .set('Cookie', [`access_token=s:${access_token}`]);

      if (ticketsRes.body.length > 0) {
        const ticket = ticketsRes.body[0];
        const qrCodePayload = ticket.qrCodeUrl;

        // Try to check-in the same ticket again
        const checkInRes = await request(app.getHttpServer()).post('/check-in').send({ qrCode: qrCodePayload });

        expect(checkInRes.status).toBe(400);
        expect(checkInRes.body).toBeDefined();
        expect(checkInRes.body.message).toContain('already been used');
      }
    });
  });

  describe('Error Handling', () => {
    let access_token: string;

    beforeAll(async () => {
      const credentials = {
        email: USER.email,
        password: USER.password,
      };
      const res = await request(app.getHttpServer()).post('/auth/login').send(credentials);
      const cookies = res.headers['set-cookie'];
      access_token = extractHttpOnlyCookie('access_token', cookies);
    });

    test('GET /orders/:id/tickets - Should fail for unpaid order', async () => {
      // Create a new order without payment
      const eventsRes = await request(app.getHttpServer())
        .get('/events')
        .query({ page: 1, limit: 1 })
        .set('Cookie', [`access_token=s:${access_token}`]);

      if (eventsRes.body.data.data.length > 0) {
        const eventId = eventsRes.body.data.data[0].id;

        const ticketsRes = await request(app.getHttpServer())
          .get(`/events/${eventId}/tickets`)
          .set('Cookie', [`access_token=s:${access_token}`]);

        if (ticketsRes.body.data.length > 0) {
          const ticketId = ticketsRes.body.data[0].id;

          const orderData = {
            eventId: eventId,
            items: [{ ticketId: ticketId, quantity: 1 }],
            description: 'Unpaid test order',
          };

          const orderRes = await request(app.getHttpServer())
            .post('/orders')
            .set('Cookie', [`access_token=s:${access_token}`])
            .send(orderData);

          // Try to get tickets for unpaid order
          const ticketsOrderRes = await request(app.getHttpServer())
            .get(`/orders/${orderRes.body.id}/tickets`)
            .set('Cookie', [`access_token=s:${access_token}`]);

          expect(ticketsOrderRes.status).toBe(400);
          expect(ticketsOrderRes.body.message).toContain('only available after the order is paid');
        }
      }
    });

    test('POST /check-in - Should fail with invalid QR code', async () => {
      const checkInRes = await request(app.getHttpServer()).post('/check-in').send({ qrCode: 'invalid-qr-code-payload' });

      expect(checkInRes.status).toBe(400);
      expect(checkInRes.body).toBeDefined();
      expect(checkInRes.body.message).toContain('Invalid QR code');
    });

    test('POST /check-in - Should fail with missing QR code', async () => {
      const checkInRes = await request(app.getHttpServer()).post('/check-in').send({});

      expect(checkInRes.status).toBe(400);
      expect(checkInRes.body).toBeDefined();
      expect(checkInRes.body.message).toContain('qrCode');
    });
  });

  afterAll(async () => {
    await cleanupApplication(app, moduleFixture);
  });
});
