/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { GeneratedEventTicket } from '../src/modules/tickets/entities/generated-event-ticket.entity';
import { Event } from '../src/modules/events/entity/event.entity';
import { Ticket } from '../src/modules/tickets/entities/ticket.entity';
import { User } from '../src/modules/users/entity/user.entity';
import { EventCategory } from '../src/modules/event-categories/entity/event-category.entity';
import { Order } from '../src/modules/orders/entity/order.entity';
import { OrderItem } from '../src/modules/orders/entity/order-item.entity';
import { OrderStatus } from '../src/common/constants/order-status.enum';
import { PostgreeConnection } from '../src/infrastructure/database/database.provider';
import { cleanupApplication } from './setup_e2e';
import { App } from 'supertest/types';

describe('QR Code Validation E2E', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;
  let dataSource: DataSource;

  // Test data
  let testEvent: Event;
  let testTicket: Ticket;
  let testUser: User;
  let testGeneratedTicket: GeneratedEventTicket;
  let testEventCategory: EventCategory;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    dataSource = moduleFixture.get<DataSource>(PostgreeConnection.provide);
    await app.init();
  });

  afterAll(async () => {
    await cleanupApplication(app, moduleFixture);
  });

  beforeEach(async () => {
    // Clean up test data
    await dataSource.getRepository(GeneratedEventTicket).createQueryBuilder().delete().execute();
    await dataSource.getRepository(Ticket).createQueryBuilder().delete().execute();
    await dataSource.getRepository(Event).createQueryBuilder().delete().execute();
    await dataSource.getRepository(User).createQueryBuilder().delete().execute();

    // Create test user
    const userRepo = dataSource.getRepository(User);
    testUser = await userRepo.save({
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashedpassword',
      roles: [], // Empty roles array to satisfy the relation
    } as unknown as User);

    // Create test event category
    const eventCategoryRepo = dataSource.getRepository(EventCategory);
    testEventCategory = await eventCategoryRepo.save({
      name: 'Test Category',
      description: 'Test Category Description',
    } as unknown as EventCategory);

    // Create test event
    const eventRepo = dataSource.getRepository(Event);
    testEvent = await eventRepo.save({
      title: 'Test Event',
      description: 'Test Description',
      location: 'Test Location',
      startDate: new Date('2026-05-01T10:00:00Z'),
      endDate: new Date('2026-05-01T12:00:00Z'),
      maxAttendees: 100,
      status: 'published',
      createdBy: testUser.id,
      categoryId: testEventCategory.id,
    } as unknown as Event);

    // Create test ticket type
    const ticketRepo = dataSource.getRepository(Ticket);
    testTicket = await ticketRepo.save({
      eventId: testEvent.id,
      name: 'Test Ticket',
      price: 100000,
      quota: 100,
      sold: 0,
      status: 'published',
    } as unknown as Ticket);

    // Create order and order item
    const orderRepo = dataSource.getRepository(Order);
    const testOrder = await orderRepo.save({
      userId: testUser.id,
      status: OrderStatus.PAID,
      totalAmount: 100000,
    } as unknown as Order);

    const orderItemRepo = dataSource.getRepository(OrderItem);
    const testOrderItem = await orderItemRepo.save({
      orderId: testOrder.id,
      ticketId: testTicket.id,
      quantity: 1,
      price: 100000,
      subtotal: 100000,
    } as unknown as OrderItem);

    // Create generated ticket
    const generatedTicketRepo = dataSource.getRepository(GeneratedEventTicket);
    testGeneratedTicket = await generatedTicketRepo.save({
      ticketId: testTicket.id,
      orderItemId: testOrderItem.id,
      qrCodeUrl: 'http://localhost:9000/tickets-public/test-qr.png',
      pdfUrl: 'http://localhost:9000/tickets-public/test-ticket.pdf',
      isUsed: false,
      issuedAt: new Date(),
    } as unknown as GeneratedEventTicket);
  });

  describe('QR Code Generation', () => {
    it('should generate valid QR code', async () => {
      const response = await request(app.getHttpServer())
        .post('/qr/generate')
        .send({
          ticketId: testGeneratedTicket.id,
          eventId: testEvent.id,
        })
        .expect(201);

      expect(response.body.qrCode).toBeDefined();
      expect(response.body.qrCode).toMatch(/^[A-Za-z0-9+/]+={0,2}$/); // Base64 pattern

      // Verify QR code can be decoded
      const decoded = Buffer.from(response.body.qrCode, 'base64').toString('utf-8');
      const parts = decoded.split(':');
      expect(parts).toHaveLength(3); // ticketId:eventId:signature
      expect(parts[0]).toBe(testGeneratedTicket.id);
      expect(parts[1]).toBe(testEvent.id);
      expect(parts[2]).toMatch(/^[a-f0-9]+$/); // HMAC signature
    });

    it('should reject invalid QR generation requests', async () => {
      // Missing ticketId
      await request(app.getHttpServer())
        .post('/qr/generate')
        .send({
          eventId: testEvent.id,
        })
        .expect(400);

      // Missing eventId
      await request(app.getHttpServer())
        .post('/qr/generate')
        .send({
          ticketId: testGeneratedTicket.id,
        })
        .expect(400);

      // Invalid UUID format
      await request(app.getHttpServer())
        .post('/qr/generate')
        .send({
          ticketId: 'invalid-uuid',
          eventId: testEvent.id,
        })
        .expect(400);
    });

    it('should generate unique QR codes for same ticket', async () => {
      const response1 = await request(app.getHttpServer())
        .post('/qr/generate')
        .send({
          ticketId: testGeneratedTicket.id,
          eventId: testEvent.id,
        })
        .expect(201);

      const response2 = await request(app.getHttpServer())
        .post('/qr/generate')
        .send({
          ticketId: testGeneratedTicket.id,
          eventId: testEvent.id,
        })
        .expect(201);

      // QR codes should be different (due to timestamp in signature)
      expect(response1.body.qrCode).not.toBe(response2.body.qrCode);
    });
  });

  describe('QR Code Validation', () => {
    it('should validate correct QR code', async () => {
      // Generate QR code first
      const qrResponse = await request(app.getHttpServer())
        .post('/qr/generate')
        .send({
          ticketId: testGeneratedTicket.id,
          eventId: testEvent.id,
        })
        .expect(201);

      // Validate QR code
      const response = await request(app.getHttpServer())
        .post('/check-in')
        .send({
          qr: qrResponse.body.qrCode,
        })
        .expect(200);

      expect(response.body.data.status).toBe('VALID');
    });

    it('should reject tampered QR codes', async () => {
      // Generate valid QR code
      const qrResponse = await request(app.getHttpServer())
        .post('/qr/generate')
        .send({
          ticketId: testGeneratedTicket.id,
          eventId: testEvent.id,
        })
        .expect(201);

      // Tamper with the signature
      const decoded = Buffer.from(qrResponse.body.qrCode, 'base64').toString('utf-8');
      const [ticketId, eventId] = decoded.split(':');
      const tamperedQr = Buffer.from(`${ticketId}:${eventId}:tampered_signature`).toString('base64');

      // Should reject tampered QR
      const response = await request(app.getHttpServer())
        .post('/check-in')
        .send({
          qr: tamperedQr,
        })
        .expect(200);

      expect(response.body.data.status).toBe('INVALID');
    });

    it('should reject QR codes with invalid base64', async () => {
      const response = await request(app.getHttpServer())
        .post('/check-in')
        .send({
          qr: 'invalid_base64_string_!@#$',
        })
        .expect(200);

      expect(response.body.data.status).toBe('INVALID');
    });

    it('should reject QR codes with wrong format', async () => {
      // Wrong number of parts
      const wrongFormatQr = Buffer.from('only_one_part').toString('base64');

      const response = await request(app.getHttpServer())
        .post('/check-in')
        .send({
          qr: wrongFormatQr,
        })
        .expect(200);

      expect(response.body.data.status).toBe('INVALID');
    });

    it('should reject QR codes for non-existent tickets', async () => {
      const validFormatQr = Buffer.from('non-existent-ticket:non-existent-event:signature').toString('base64');

      const response = await request(app.getHttpServer())
        .post('/check-in')
        .send({
          qr: validFormatQr,
        })
        .expect(200);

      expect(response.body.data.status).toBe('INVALID');
    });

    it('should reject QR codes with wrong event ID', async () => {
      // Generate QR code for correct ticket
      const qrResponse = await request(app.getHttpServer())
        .post('/qr/generate')
        .send({
          ticketId: testGeneratedTicket.id,
          eventId: testEvent.id,
        })
        .expect(201);

      // Create another event
      const eventRepo = dataSource.getRepository(Event);
      const otherEvent = await eventRepo.save({
        title: 'Other Event',
        description: 'Other Description',
        location: 'Other Location',
        startDate: new Date('2026-05-02T10:00:00Z'),
        endDate: new Date('2026-05-02T12:00:00Z'),
        maxAttendees: 100,
        status: 'published',
        createdBy: testUser.id,
        categoryId: testEventCategory.id,
      } as unknown as Event);

      // Try to use QR with wrong event ID
      const decoded = Buffer.from(qrResponse.body.qrCode, 'base64').toString('utf-8');
      const [ticketId] = decoded.split(':');
      const wrongEventQr = Buffer.from(`${ticketId}:${otherEvent.id}:fake_signature`).toString('base64');

      const response = await request(app.getHttpServer())
        .post('/check-in')
        .send({
          qr: wrongEventQr,
        })
        .expect(200);

      expect(response.body.data.status).toBe('INVALID');
    });
  });

  describe('Single-Use Enforcement', () => {
    it('should allow first check-in only', async () => {
      // Generate QR code
      const qrResponse = await request(app.getHttpServer())
        .post('/qr/generate')
        .send({
          ticketId: testGeneratedTicket.id,
          eventId: testEvent.id,
        })
        .expect(201);

      // First check-in should succeed
      const firstResponse = await request(app.getHttpServer())
        .post('/check-in')
        .send({
          qr: qrResponse.body.qrCode,
        })
        .expect(200);

      expect(firstResponse.body.data.status).toBe('VALID');

      // Second check-in should fail
      const secondResponse = await request(app.getHttpServer())
        .post('/check-in')
        .send({
          qr: qrResponse.body.qrCode,
        })
        .expect(200);

      expect(secondResponse.body.data.status).toBe('ALREADY_USED');

      // Verify ticket is marked as used
      const ticketRepo = dataSource.getRepository(GeneratedEventTicket);
      const ticket = await ticketRepo.findOne({
        where: { id: testGeneratedTicket.id },
      });
      expect(ticket?.isUsed).toBe(true);
    });

    it('should handle concurrent check-in attempts', async () => {
      // Generate QR code
      const qrResponse = await request(app.getHttpServer())
        .post('/qr/generate')
        .send({
          ticketId: testGeneratedTicket.id,
          eventId: testEvent.id,
        })
        .expect(201);

      // Simulate concurrent requests
      const promises = Array(10)
        .fill(null)
        .map(() =>
          request(app.getHttpServer()).post('/check-in').send({
            qr: qrResponse.body.qrCode,
          }),
        );

      const results = await Promise.all(promises);

      // Only one should succeed
      const validCount = results.filter((res) => res.body.data.status === 'VALID').length;
      const alreadyUsedCount = results.filter((res) => res.body.data.status === 'ALREADY_USED').length;

      expect(validCount).toBe(1);
      expect(alreadyUsedCount).toBe(9);
    });
  });

  describe('Security Tests', () => {
    it('should prevent QR code replay attacks', async () => {
      // Generate QR code and use it
      const qrResponse = await request(app.getHttpServer())
        .post('/qr/generate')
        .send({
          ticketId: testGeneratedTicket.id,
          eventId: testEvent.id,
        })
        .expect(201);

      // Use QR code once
      await request(app.getHttpServer())
        .post('/check-in')
        .send({
          qr: qrResponse.body.qrCode,
        })
        .expect(200);

      // Try to use the same QR code again (replay attack)
      const response = await request(app.getHttpServer())
        .post('/check-in')
        .send({
          qr: qrResponse.body.qrCode,
        })
        .expect(200);

      expect(response.body.data.status).toBe('ALREADY_USED');
    });

    it('should prevent QR code forgery', async () => {
      // Try to create a forged QR code with valid format but fake signature
      const forgedQr = Buffer.from(`${testGeneratedTicket.id}:${testEvent.id}:forged_signature`).toString('base64');

      const response = await request(app.getHttpServer())
        .post('/check-in')
        .send({
          qr: forgedQr,
        })
        .expect(200);

      expect(response.body.data.status).toBe('INVALID');
    });

    it('should handle malformed QR codes gracefully', async () => {
      const malformedQrs = [
        'not_base64', // Not base64
        'dGVzdA==', // Valid base64 but wrong content
        Buffer.from('too:many:parts:in:qr:code').toString('base64'), // Too many parts
        Buffer.from('not_enough_parts').toString('base64'), // Not enough parts
      ];

      for (const qr of malformedQrs) {
        const response = await request(app.getHttpServer())
          .post('/check-in')
          .send({
            qr,
          })
          .expect(200);

        expect(response.body.data.status).toBe('INVALID');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long QR codes', async () => {
      // Create a QR code with very long data
      const longData = 'a'.repeat(1000);
      const longQr = Buffer.from(`${testGeneratedTicket.id}:${testEvent.id}:${longData}`).toString('base64');

      const response = await request(app.getHttpServer())
        .post('/check-in')
        .send({
          qr: longQr,
        })
        .expect(200);

      expect(response.body.data.status).toBe('INVALID');
    });

    it('should handle special characters in QR codes', async () => {
      // Test with special characters
      const specialQr = Buffer.from(`${testGeneratedTicket.id}:${testEvent.id}:signature_with_!@#$%^&*()_+-=[]{}|;:,.<>?`).toString('base64');

      const response = await request(app.getHttpServer())
        .post('/check-in')
        .send({
          qr: specialQr,
        })
        .expect(200);

      expect(response.body.data.status).toBe('INVALID');
    });

    it('should validate request format strictly', async () => {
      // Missing qr field
      await request(app.getHttpServer()).post('/check-in').send({}).expect(400);

      // Wrong type for qr
      await request(app.getHttpServer())
        .post('/check-in')
        .send({
          qr: 123,
        })
        .expect(400);

      // Empty string
      await request(app.getHttpServer())
        .post('/check-in')
        .send({
          qr: '',
        })
        .expect(400);

      // Null value
      await request(app.getHttpServer())
        .post('/check-in')
        .send({
          qr: null,
        })
        .expect(400);
    });
  });
});
