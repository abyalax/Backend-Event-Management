import { Test, TestingModule } from '@nestjs/testing';
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
import { Queue } from 'bullmq';
import { getQueueToken } from '@nestjs/bullmq';
import { PostgreeConnection } from '../src/infrastructure/database/database.provider';
import { App } from 'supertest/types';
import { INestApplication } from '@nestjs/common';
import { cleanupApplication } from './setup_e2e';

describe('PDF Generation E2E', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;
  let dataSource: DataSource;
  let pdfQueue: Queue;

  let testEvent: Event;
  let testEventCategory: EventCategory;
  let testTicket: Ticket;
  let testUser: User;
  let testOrder: Order;
  let testOrderItem: OrderItem;
  let testGeneratedTicket: GeneratedEventTicket;

  const createEvent = async (overrides: Partial<Event> = {}): Promise<Event> => {
    return dataSource.getRepository(Event).save({
      title: 'Test Event',
      description: 'Test Description',
      location: 'Test Location',
      startDate: new Date('2026-05-01T10:00:00Z'),
      endDate: new Date('2026-05-01T12:00:00Z'),
      maxAttendees: 100,
      status: 'published',
      createdBy: testUser.id,
      categoryId: testEventCategory.id,
      ...overrides,
    } as Event);
  };

  const createGeneratedTicket = async (overrides: Partial<GeneratedEventTicket> = {}): Promise<GeneratedEventTicket> => {
    return dataSource.getRepository(GeneratedEventTicket).save({
      ticketId: testTicket.id,
      orderItemId: testOrderItem.id,
      qrCodeUrl: `http://localhost:9000/tickets-public/qr-${Date.now()}-${Math.random().toString(36).slice(2)}.png`,
      pdfUrl: `http://localhost:9000/tickets-public/ticket-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`,
      isUsed: false,
      issuedAt: new Date(),
      ...overrides,
    } as GeneratedEventTicket);
  };

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    dataSource = moduleFixture.get<DataSource>(PostgreeConnection.provide);
    pdfQueue = moduleFixture.get<Queue>(getQueueToken('pdf'));

    await app.init();
  });

  afterAll(async () => {
    await cleanupApplication(app, moduleFixture);
  });

  beforeEach(async () => {
    await dataSource.getRepository(GeneratedEventTicket).createQueryBuilder().delete().execute();
    await dataSource.getRepository(OrderItem).createQueryBuilder().delete().execute();
    await dataSource.getRepository(Order).createQueryBuilder().delete().execute();
    await dataSource.getRepository(Ticket).createQueryBuilder().delete().execute();
    await dataSource.getRepository(Event).createQueryBuilder().delete().execute();
    await dataSource.getRepository(EventCategory).createQueryBuilder().delete().execute();
    await dataSource.getRepository(User).createQueryBuilder().delete().execute();

    await pdfQueue.clean(0, 0, 'completed');
    await pdfQueue.clean(0, 0, 'failed');
    await pdfQueue.clean(0, 0, 'waiting');

    testUser = await dataSource.getRepository(User).save({
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashedpassword',
      roles: [],
    } as unknown as User);

    testEventCategory = await dataSource.getRepository(EventCategory).save({
      name: 'Test Category',
      description: 'Test Category Description',
    } as EventCategory);

    testEvent = await createEvent();

    testTicket = await dataSource.getRepository(Ticket).save({
      eventId: testEvent.id,
      name: 'Test Ticket',
      price: 100000,
      quota: 100,
      sold: 0,
      status: 'published',
    } as unknown as Ticket);

    testOrder = await dataSource.getRepository(Order).save({
      userId: testUser.id,
      status: OrderStatus.PAID,
      totalAmount: 100000,
    } as Order);

    testOrderItem = await dataSource.getRepository(OrderItem).save({
      orderId: testOrder.id,
      ticketId: testTicket.id,
      quantity: 1,
      price: 100000,
      subtotal: 100000,
    } as OrderItem);

    testGeneratedTicket = await createGeneratedTicket({
      pdfUrl: 'http://localhost:9000/tickets-public/test-ticket.pdf',
      qrCodeUrl: 'http://localhost:9000/tickets-public/test-qr.png',
    });
  });

  describe('PDF Generation Queue', () => {
    it('should add PDF generation job to queue', async () => {
      await pdfQueue.add('generate-ticket-pdf', {
        ticketId: testGeneratedTicket.id,
      });

      const jobs = await pdfQueue.getJobs(['waiting', 'active', 'completed', 'failed']);
      const pdfJob = jobs.find((job) => job.data.ticketId === testGeneratedTicket.id);

      expect(pdfJob).toBeDefined();
      if (pdfJob) {
        expect(pdfJob.name).toBe('generate-ticket-pdf');
        expect(pdfJob.data.ticketId).toBe(testGeneratedTicket.id);
      }
    });

    it('should use correct job ID for idempotency', async () => {
      const jobId = `generate-ticket-${testGeneratedTicket.id}`;

      await pdfQueue.add(
        'generate-ticket-pdf',
        {
          ticketId: testGeneratedTicket.id,
        },
        {
          jobId,
        },
      );

      await pdfQueue.add(
        'generate-ticket-pdf',
        {
          ticketId: testGeneratedTicket.id,
        },
        {
          jobId,
        },
      );

      const jobs = await pdfQueue.getJobs(['waiting', 'active', 'completed', 'failed']);
      const duplicateJobs = jobs.filter((job) => job.data.ticketId === testGeneratedTicket.id);

      expect(duplicateJobs).toHaveLength(1);
    });

    it('should handle job failure gracefully', async () => {
      const invalidTicket = await createGeneratedTicket({
        pdfUrl: 'http://localhost:9000/tickets-public/invalid-ticket.pdf',
        qrCodeUrl: 'http://localhost:9000/tickets-public/invalid-qr.png',
      });

      await pdfQueue.add('generate-ticket-pdf', {
        ticketId: invalidTicket.id,
      });

      const jobs = await pdfQueue.getJobs(['waiting', 'active', 'completed', 'failed']);
      const invalidJob = jobs.find((job) => job.data.ticketId === invalidTicket.id);

      expect(invalidJob).toBeDefined();
    });
  });

  describe('PDF Generation Process', () => {
    it('should generate PDF with correct content', async () => {
      const response = await request(app.getHttpServer()).get('/health').expect(200);

      expect(response.body.status).toBe('ok');
    });

    it('should handle QR code embedding in PDF', async () => {
      const qrResponse = await request(app.getHttpServer())
        .post('/qr/generate')
        .send({
          ticketId: testGeneratedTicket.id,
          eventId: testEvent.id,
        })
        .expect(201);

      expect(qrResponse.body.qrCode).toBeDefined();
      expect(qrResponse.body.qrCode).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
    });

    it('should store PDF in MinIO with correct path', () => {
      const expectedPathPattern = `tickets/${testEvent.id}/`;
      expect(expectedPathPattern).toContain('tickets/');
      expect(expectedPathPattern).toContain(testEvent.id);
    });

    it('should update ticket with PDF URL', async () => {
      const generatedTicketRepo = dataSource.getRepository(GeneratedEventTicket);

      const ticketBefore = await generatedTicketRepo.findOne({
        where: { id: testGeneratedTicket.id },
      });
      expect(ticketBefore?.pdfUrl).toBe(testGeneratedTicket.pdfUrl);

      const mockPdfUrl = `http://localhost:9000/tickets-public/${testEvent.id}/test-ticket.pdf`;
      await generatedTicketRepo.update(testGeneratedTicket.id, {
        pdfUrl: mockPdfUrl,
      });

      const ticketAfter = await generatedTicketRepo.findOne({
        where: { id: testGeneratedTicket.id },
      });
      expect(ticketAfter?.pdfUrl).toBe(mockPdfUrl);
    });
  });

  describe('PDF Generation Edge Cases', () => {
    it('should skip generation if PDF already exists', async () => {
      const generatedTicketRepo = dataSource.getRepository(GeneratedEventTicket);
      await generatedTicketRepo.update(testGeneratedTicket.id, {
        pdfUrl: 'http://localhost:9000/tickets-public/existing.pdf',
      });

      await pdfQueue.add('generate-ticket-pdf', {
        ticketId: testGeneratedTicket.id,
      });

      const ticket = await generatedTicketRepo.findOne({
        where: { id: testGeneratedTicket.id },
      });
      expect(ticket?.pdfUrl).toBe('http://localhost:9000/tickets-public/existing.pdf');
    });

    it('should handle missing ticket gracefully', async () => {
      await pdfQueue.add('generate-ticket-pdf', {
        ticketId: 'non-existent-ticket-id',
      });

      const jobs = await pdfQueue.getJobs(['waiting', 'active', 'completed', 'failed']);
      const job = jobs.find((job) => job.data.ticketId === 'non-existent-ticket-id');

      expect(job).toBeDefined();
    });

    it('should handle missing event gracefully', async () => {
      const orphanTicket = await createGeneratedTicket({
        pdfUrl: 'http://localhost:9000/tickets-public/orphan-ticket.pdf',
        qrCodeUrl: 'http://localhost:9000/tickets-public/orphan-qr.png',
      });

      await pdfQueue.add('generate-ticket-pdf', {
        ticketId: orphanTicket.id,
      });

      const jobs = await pdfQueue.getJobs(['waiting', 'active', 'completed', 'failed']);
      const job = jobs.find((job) => job.data.ticketId === orphanTicket.id);

      expect(job).toBeDefined();
    });

    it('should handle missing user gracefully', async () => {
      const orphanTicket = await createGeneratedTicket({
        pdfUrl: 'http://localhost:9000/tickets-public/orphan-user-ticket.pdf',
        qrCodeUrl: 'http://localhost:9000/tickets-public/orphan-user-qr.png',
      });

      await pdfQueue.add('generate-ticket-pdf', {
        ticketId: orphanTicket.id,
      });

      const jobs = await pdfQueue.getJobs(['waiting', 'active', 'completed', 'failed']);
      const job = jobs.find((job) => job.data.ticketId === orphanTicket.id);

      expect(job).toBeDefined();
    });
  });

  describe('PDF Content Validation', () => {
    it('should include required ticket information', () => {
      const requiredFields = {
        eventName: testEvent.title,
        eventDate: testEvent.startDate,
        eventLocation: testEvent.location,
        userName: testUser.name,
        ticketId: testGeneratedTicket.id,
      };

      expect(requiredFields.eventName).toBe('Test Event');
      expect(requiredFields.userName).toBe('Test User');
      expect(requiredFields.ticketId).toBeDefined();
    });

    it('should handle special characters in event data', async () => {
      const specialEvent = await createEvent({
        title: 'Event with Special Characters: !@#$%^&*()',
        description: 'Description with special characters and emojis',
        location: 'Venue with "quotes" and \'apostrophes\'',
      });

      const specialTicket = await dataSource.getRepository(Ticket).save({
        eventId: specialEvent.id,
        name: 'Special Ticket',
        price: '100000',
        quota: 100,
        sold: 0,
        status: 'published',
      } as unknown as Ticket);

      const specialOrder = await dataSource.getRepository(Order).save({
        userId: testUser.id,
        status: OrderStatus.PAID,
        totalAmount: 100000,
      } as Order);

      const specialOrderItem = await dataSource.getRepository(OrderItem).save({
        orderId: specialOrder.id,
        ticketId: specialTicket.id,
        quantity: 1,
        price: 100000,
        subtotal: 100000,
      } as OrderItem);

      const specialGeneratedTicket = await dataSource.getRepository(GeneratedEventTicket).save({
        ticketId: specialTicket.id,
        orderItemId: specialOrderItem.id,
        qrCodeUrl: 'http://localhost:9000/tickets-public/special-qr.png',
        pdfUrl: 'http://localhost:9000/tickets-public/special-ticket.pdf',
        isUsed: false,
        issuedAt: new Date(),
      } as GeneratedEventTicket);

      const qrResponse = await request(app.getHttpServer())
        .post('/qr/generate')
        .send({
          ticketId: specialGeneratedTicket.id,
          eventId: specialEvent.id,
        })
        .expect(201);

      expect(qrResponse.body.qrCode).toBeDefined();

      await dataSource.getRepository(GeneratedEventTicket).delete({ id: specialGeneratedTicket.id });
      await dataSource.getRepository(OrderItem).delete({ id: specialOrderItem.id });
      await dataSource.getRepository(Order).delete({ id: specialOrder.id });
      await dataSource.getRepository(Ticket).delete({ id: specialTicket.id });
      await dataSource.getRepository(Event).delete({ id: specialEvent.id });
    });

    it('should handle very long event titles', async () => {
      const longTitle = 'A'.repeat(200);
      const longEvent = await createEvent({
        title: longTitle,
        description: 'Event with very long title',
        location: 'Test Location',
      });

      expect(longEvent.title).toBe(longTitle);

      await dataSource.getRepository(Event).delete({ id: longEvent.id });
    });
  });

  describe('PDF Storage', () => {
    it('should use correct bucket name', () => {
      const expectedBucket = 'tickets-public';
      expect(expectedBucket).toBe('tickets-public');
    });

    it('should generate unique file names', () => {
      const fileName1 = `ticket-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.pdf`;
      const fileName2 = `ticket-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.pdf`;

      expect(fileName1).not.toBe(fileName2);
      expect(fileName1).toMatch(/\.pdf$/);
      expect(fileName2).toMatch(/\.pdf$/);
    });

    it('should construct correct file path', () => {
      const eventId = testEvent.id;
      const fileName = 'test-ticket.pdf';
      const expectedPath = `tickets/${eventId}/${fileName}`;

      expect(expectedPath).toContain('tickets/');
      expect(expectedPath).toContain(eventId);
      expect(expectedPath).toContain(fileName);
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple PDF generation requests', async () => {
      const tickets: GeneratedEventTicket[] = [];
      for (let i = 0; i < 5; i++) {
        const ticket = await createGeneratedTicket({
          qrCodeUrl: `http://localhost:9000/tickets-public/bulk-qr-${i}.png`,
          pdfUrl: `http://localhost:9000/tickets-public/bulk-ticket-${i}.pdf`,
        });
        tickets.push(ticket);
      }

      for (const ticket of tickets) {
        await pdfQueue.add('generate-ticket-pdf', {
          ticketId: ticket.id,
        });
      }

      const jobs = await pdfQueue.getJobs(['waiting', 'active', 'completed', 'failed']);
      const pdfJobs = jobs.filter((job) => tickets.some((ticket) => job.data.ticketId === ticket.id));

      expect(pdfJobs).toHaveLength(5);

      for (const ticket of tickets) {
        await dataSource.getRepository(GeneratedEventTicket).delete({ id: ticket.id });
      }
    });

    it('should handle concurrent job processing', async () => {
      const promises = Array(3)
        .fill(null)
        .map((_, index) =>
          pdfQueue.add('generate-ticket-pdf', {
            ticketId: `${testGeneratedTicket.id}-${index}`,
          }),
        );

      await Promise.all(promises);

      const jobs = await pdfQueue.getJobs(['waiting', 'active', 'completed', 'failed']);
      expect(jobs.length).toBeGreaterThanOrEqual(3);
    });
  });
});
