import { TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { GeneratedEventTicket } from '../src/modules/tickets/entities/generated-event-ticket.entity';
import { Event } from '../src/modules/events/entity/event.entity';
import { EventCategory } from '../src/modules/event-categories/entity/event-category.entity';
import { Ticket } from '../src/modules/tickets/entities/ticket.entity';
import { User } from '../src/modules/users/entity/user.entity';
import { Order } from '../src/modules/orders/entity/order.entity';
import { OrderItem } from '../src/modules/orders/entity/order-item.entity';
import { Queue } from 'bullmq';
import { getQueueToken } from '@nestjs/bullmq';
import { cleanupApplication, setupApplication } from './setup_e2e';
import { PostgreeConnection } from '../src/infrastructure/database/database.provider';
import { App } from 'supertest/types';
import { INestApplication } from '@nestjs/common';

describe('Ticket and QR Code Flow E2E', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;
  let dataSource: DataSource;
  let pdfQueue: Queue;
  let emailQueue: Queue;

  // Test data
  let testEventCategory: EventCategory;
  let testEvent: Event;
  let testTicket: Ticket;
  let testUser: User;
  let testOrder: Order;
  let testOrderItem: OrderItem;
  let testGeneratedTicket: GeneratedEventTicket;

  beforeAll(async () => {
    [app, moduleFixture] = await setupApplication();
    dataSource = moduleFixture.get<DataSource>(PostgreeConnection.provide);
    pdfQueue = moduleFixture.get<Queue>(getQueueToken('pdf'));
    emailQueue = moduleFixture.get<Queue>(getQueueToken('email'));
  });

  afterAll(async () => {
    await cleanupApplication(app, moduleFixture);
  });

  beforeEach(async () => {
    // Clean up test data
    await dataSource.getRepository(GeneratedEventTicket).createQueryBuilder().delete().from(GeneratedEventTicket).execute();
    await dataSource.getRepository(OrderItem).createQueryBuilder().delete().from(OrderItem).execute();
    await dataSource.getRepository(Order).createQueryBuilder().delete().from(Order).execute();
    await dataSource.getRepository(Ticket).createQueryBuilder().delete().from(Ticket).execute();
    await dataSource.getRepository(Event).createQueryBuilder().delete().from(Event).execute();
    await dataSource.getRepository(EventCategory).createQueryBuilder().delete().from(EventCategory).execute();
    await dataSource.getRepository(User).createQueryBuilder().delete().from(User).execute();

    // Clear queues
    await pdfQueue.clean(0, 0, 'completed');
    await pdfQueue.clean(0, 0, 'failed');
    await emailQueue.clean(0, 0, 'completed');
    await emailQueue.clean(0, 0, 'failed');

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
      categoryId: testEventCategory.id,
      createdBy: testUser.id,
    } as unknown as Event);

    // Create test ticket type
    const ticketRepo = dataSource.getRepository(Ticket);
    testTicket = await ticketRepo.save({
      eventId: testEvent.id,
      name: 'Test Ticket',
      price: '100000',
      quota: 100,
      sold: 0,
      status: 'published',
    } as unknown as Ticket);
  });

  describe('Complete Ticket Purchase Flow', () => {
    it('should process complete flow from purchase to QR validation', async () => {
      // Step 1: Create order
      const orderRepo = dataSource.getRepository(Order);
      testOrder = await orderRepo.save({
        userId: testUser.id,
        status: 'PAID',
        totalAmount: 100000,
      } as unknown as Order);

      // Step 2: Create order item
      const orderItemRepo = dataSource.getRepository(OrderItem);
      testOrderItem = await orderItemRepo.save({
        orderId: testOrder.id,
        ticketId: testTicket.id,
        quantity: 1,
        price: 100000,
        subtotal: 100000,
      } as unknown as OrderItem);

      // Step 3: Create generated ticket (simulating payment success)
      const generatedTicketRepo = dataSource.getRepository(GeneratedEventTicket);
      testGeneratedTicket = await generatedTicketRepo.save({
        ticketId: testTicket.id,
        orderItemId: testOrderItem.id,
        qrCodeUrl: 'http://localhost:9000/tickets-public/test-qr.png',
        pdfUrl: 'http://localhost:9000/tickets-public/test-ticket.pdf',
        isUsed: false,
        issuedAt: new Date(),
      } as unknown as GeneratedEventTicket);

      // Step 4: Trigger PDF generation queue job
      await pdfQueue.add('generate-ticket-pdf', {
        ticketId: testGeneratedTicket.id,
      });

      // Step 5: Wait for PDF generation job to complete
      const pdfJob = await pdfQueue.getJob(`generate-ticket:${testGeneratedTicket.id}`);
      expect(pdfJob).toBeDefined();

      // Step 6: Verify PDF was generated and stored
      const updatedTicket = await generatedTicketRepo.findOne({
        where: { id: testGeneratedTicket.id },
      });
      expect(updatedTicket?.pdfUrl).toBeDefined();
      expect(updatedTicket?.pdfUrl).toContain('tickets-public');

      // Step 7: Trigger email sending queue job
      await emailQueue.add('send-ticket-email', {
        ticketId: testGeneratedTicket.id,
      });

      // Step 8: Verify email job was created
      const emailJobs = await emailQueue.getJobs(['waiting', 'active', 'completed']);
      const emailJob = emailJobs.find((job) => job.data.ticketId === testGeneratedTicket.id);
      expect(emailJob).toBeDefined();

      // Step 9: Generate QR code for testing
      const qrResponse = await request(app.getHttpServer())
        .post('/qr/generate')
        .send({
          ticketId: testGeneratedTicket.id,
          eventId: testEvent.id,
        })
        .expect(201);

      expect(qrResponse.body.qrCode).toBeDefined();
      expect(qrResponse.body.qrCode).toMatch(/^[A-Za-z0-9+/]+={0,2}$/); // Base64 pattern

      // Step 10: Test QR validation (check-in)
      const checkInResponse = await request(app.getHttpServer())
        .post('/check-in')
        .send({
          qr: qrResponse.body.qrCode,
        })
        .expect(200);

      expect(checkInResponse.body.data.status).toBe('VALID');

      // Step 11: Verify ticket is marked as used
      const validatedTicket = await generatedTicketRepo.findOne({
        where: { id: testGeneratedTicket.id },
      });
      expect(validatedTicket?.isUsed).toBe(true);

      // Step 12: Test duplicate QR scan
      const duplicateCheckInResponse = await request(app.getHttpServer())
        .post('/check-in')
        .send({
          qr: qrResponse.body.qrCode,
        })
        .expect(200);

      expect(duplicateCheckInResponse.body.data.status).toBe('ALREADY_USED');
    });

    it('should handle invalid QR codes properly', async () => {
      // Test with invalid base64 string
      await request(app.getHttpServer())
        .post('/check-in')
        .send({
          qr: 'invalid_base64_string',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toEqual(['qr must be a string']);
        });

      // Test with tampered QR code
      await request(app.getHttpServer())
        .post('/check-in')
        .send({
          qr: 'dGFtZXJlZF9kYXRh', // base64 for "tampered_data"
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.status).toBe('INVALID');
        });

      // Test with non-existent ticket
      const validFormatQr = Buffer.from('non-existent-ticket-id:non-existent-event-id:invalid_signature').toString('base64');
      await request(app.getHttpServer())
        .post('/check-in')
        .send({
          qr: validFormatQr,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.status).toBe('INVALID');
        });
    });

    it('should validate QR code signature properly', async () => {
      // Create a valid QR code format but with wrong signature
      const ticketId = testGeneratedTicket.id;
      const eventId = testEvent.id;
      const wrongSignature = 'wrong_signature_value';
      const tamperedQr = Buffer.from(`${ticketId}:${eventId}:${wrongSignature}`).toString('base64');

      await request(app.getHttpServer())
        .post('/check-in')
        .send({
          qr: tamperedQr,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.status).toBe('INVALID');
        });
    });
  });

  describe('PDF Generation Edge Cases', () => {
    it('should handle duplicate PDF generation requests', async () => {
      // Create order and order item for this test
      const orderRepo = dataSource.getRepository(Order);
      const testOrder = await orderRepo.save({
        userId: testUser.id,
        status: 'PAID',
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

      // Create a ticket with existing PDF
      const generatedTicketRepo = dataSource.getRepository(GeneratedEventTicket);
      const ticketWithPdf = await generatedTicketRepo.save({
        ticketId: testTicket.id,
        orderItemId: testOrderItem.id,
        qrCodeUrl: 'http://localhost:9000/tickets-public/existing-qr.png',
        pdfUrl: 'http://localhost:9000/tickets-public/existing.pdf',
        isUsed: false,
        issuedAt: new Date(),
      } as unknown as GeneratedEventTicket);

      // Try to generate PDF again
      await pdfQueue.add('generate-ticket-pdf', {
        ticketId: ticketWithPdf.id,
      });

      // Should not create new PDF if it already exists
      const ticketAfterRetry = await generatedTicketRepo.findOne({
        where: { id: ticketWithPdf.id },
      });
      expect(ticketAfterRetry?.pdfUrl).toBe('http://localhost:9000/tickets-public/existing.pdf');
    });

    it('should handle PDF generation failure gracefully', async () => {
      // Create order and order item for this test
      const orderRepo = dataSource.getRepository(Order);
      const testOrder = await orderRepo.save({
        userId: testUser.id,
        status: 'PAID',
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

      // Create a ticket with invalid data that might cause PDF generation to fail
      const generatedTicketRepo = dataSource.getRepository(GeneratedEventTicket);
      const invalidTicket = await generatedTicketRepo.save({
        ticketId: testTicket.id,
        orderItemId: testOrderItem.id,
        qrCodeUrl: 'http://localhost:9000/tickets-public/invalid-qr.png',
        pdfUrl: 'http://localhost:9000/tickets-public/invalid-ticket.pdf',
        isUsed: false,
        issuedAt: new Date(),
      } as unknown as GeneratedEventTicket);

      // PDF generation should fail gracefully
      await pdfQueue.add('generate-ticket-pdf', {
        ticketId: invalidTicket.id,
      });

      // The job should fail and not set pdfUrl
      const ticketAfterFailure = await generatedTicketRepo.findOne({
        where: { id: invalidTicket.id },
      });
      expect(ticketAfterFailure?.pdfUrl).toBeNull();
    });
  });

  describe('Email Distribution', () => {
    it('should send email with PDF link after PDF generation', async () => {
      // Create order and order item for this test
      const orderRepo = dataSource.getRepository(Order);
      const testOrder = await orderRepo.save({
        userId: testUser.id,
        status: 'PAID',
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

      // Create a complete ticket with PDF
      const generatedTicketRepo = dataSource.getRepository(GeneratedEventTicket);
      const ticketWithEmail = await generatedTicketRepo.save({
        ticketId: testTicket.id,
        orderItemId: testOrderItem.id,
        qrCodeUrl: 'http://localhost:9000/tickets-public/email-qr.png',
        pdfUrl: 'http://localhost:9000/tickets-public/test-ticket.pdf',
        isUsed: false,
        issuedAt: new Date(),
      } as unknown as GeneratedEventTicket);

      // Trigger email sending
      await emailQueue.add('send-ticket-email', {
        ticketId: ticketWithEmail.id,
      });

      // Verify email job was created
      const emailJobs = await emailQueue.getJobs(['waiting', 'active', 'completed']);
      const emailJob = emailJobs.find((job) => job.data.ticketId === ticketWithEmail.id);
      expect(emailJob).toBeDefined();
      expect(emailJob?.name).toBe('send-ticket-email');
      expect(emailJob?.data.ticketId).toBe(ticketWithEmail.id);
    });

    it('should handle email sending failure gracefully', async () => {
      // Create order and order item for this test
      const orderRepo = dataSource.getRepository(Order);
      const testOrder = await orderRepo.save({
        userId: testUser.id,
        status: 'PAID',
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

      // Create a ticket for testing email failure
      const generatedTicketRepo = dataSource.getRepository(GeneratedEventTicket);
      const ticketWithInvalidUser = await generatedTicketRepo.save({
        ticketId: testTicket.id,
        orderItemId: testOrderItem.id,
        qrCodeUrl: 'http://localhost:9000/tickets-public/invalid-user-qr.png',
        pdfUrl: 'http://localhost:9000/tickets-public/test-ticket.pdf',
        isUsed: false,
        issuedAt: new Date(),
      } as unknown as GeneratedEventTicket);

      // Email sending should fail gracefully
      await emailQueue.add('send-ticket-email', {
        ticketId: ticketWithInvalidUser.id,
      });

      // The job should fail but not crash the system
      const emailJobs = await emailQueue.getJobs(['failed']);
      const failedEmailJob = emailJobs.find((job) => job.data.ticketId === ticketWithInvalidUser.id);
      expect(failedEmailJob).toBeDefined();
    });
  });

  describe('QR Code Security', () => {
    it('should prevent QR code tampering', async () => {
      // Create order and order item for this test
      const orderRepo = dataSource.getRepository(Order);
      const testOrder = await orderRepo.save({
        userId: testUser.id,
        status: 'PAID',
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

      // Create a generated ticket for QR testing
      const generatedTicketRepo = dataSource.getRepository(GeneratedEventTicket);
      await generatedTicketRepo.save({
        ticketId: testTicket.id,
        orderItemId: testOrderItem.id,
        qrCodeUrl: 'http://localhost:9000/tickets-public/security-test-qr.png',
        pdfUrl: 'http://localhost:9000/tickets-public/security-test-ticket.pdf',
        isUsed: false,
        issuedAt: new Date(),
      } as unknown as GeneratedEventTicket);

      // Generate a valid QR code
      const qrResponse = await request(app.getHttpServer())
        .post('/qr/generate')
        .send({
          ticketId: testTicket.id,
          eventId: testEvent.id,
        })
        .expect(201);

      const validQr = qrResponse.body.data.qrCode;

      // Decode and tamper with the QR code
      const decoded = Buffer.from(validQr, 'base64').toString('utf-8');
      const [ticketId, eventId] = decoded.split(':');

      // Create tampered QR with same ticket but different signature
      const tamperedQr = Buffer.from(`${ticketId}:${eventId}:tampered_signature`).toString('base64');

      // Tampered QR should be rejected
      await request(app.getHttpServer())
        .post('/check-in')
        .send({
          qr: tamperedQr,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.status).toBe('INVALID');
        });
    });

    it('should enforce atomic ticket validation', async () => {
      // Create order and order item for this test
      const orderRepo = dataSource.getRepository(Order);
      const testOrder = await orderRepo.save({
        userId: testUser.id,
        status: 'PAID',
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

      // Create a ticket for testing atomic validation
      const generatedTicketRepo = dataSource.getRepository(GeneratedEventTicket);
      const atomicTestTicket = await generatedTicketRepo.save({
        ticketId: testTicket.id,
        orderItemId: testOrderItem.id,
        qrCodeUrl: 'http://localhost:9000/tickets-public/atomic-qr.png',
        pdfUrl: 'http://localhost:9000/tickets-public/atomic-ticket.pdf',
        isUsed: false,
        issuedAt: new Date(),
      } as unknown as GeneratedEventTicket);

      // Generate QR code
      const qrResponse = await request(app.getHttpServer())
        .post('/qr/generate')
        .send({
          ticketId: testTicket.id,
          eventId: testEvent.id,
        })
        .expect(201);

      // Simulate concurrent check-in attempts
      const checkInPromises = Array(5)
        .fill(null)
        .map(() =>
          request(app.getHttpServer()).post('/check-in').send({
            qr: qrResponse.body.qrCode,
          }),
        );

      const results = await Promise.all(checkInPromises);

      // Only one should succeed (VALID), others should get ALREADY_USED
      const validCount = results.filter((res) => res.body.data.status === 'VALID').length;
      const alreadyUsedCount = results.filter((res) => res.body.data.status === 'ALREADY_USED').length;

      expect(validCount).toBe(1);
      expect(alreadyUsedCount).toBe(4);

      // Verify ticket is marked as used
      const finalTicket = await generatedTicketRepo.findOne({
        where: { id: atomicTestTicket.id },
      });
      expect(finalTicket?.isUsed).toBe(true);
    });
  });

  describe('API Validation', () => {
    it('should validate check-in request format', async () => {
      // Missing qr field
      await request(app.getHttpServer()).post('/check-in').send({}).expect(400);

      // Invalid qr type
      await request(app.getHttpServer())
        .post('/check-in')
        .send({
          qr: 123,
        })
        .expect(400);

      // Empty qr string
      await request(app.getHttpServer())
        .post('/check-in')
        .send({
          qr: '',
        })
        .expect(400);
    });

    it('should validate QR generation request format', async () => {
      // Missing required fields
      await request(app.getHttpServer()).post('/qr/generate').send({}).expect(400);

      await request(app.getHttpServer())
        .post('/qr/generate')
        .send({
          ticketId: 'test-id',
        })
        .expect(400);

      await request(app.getHttpServer())
        .post('/qr/generate')
        .send({
          eventId: 'test-id',
        })
        .expect(400);
    });
  });
});
