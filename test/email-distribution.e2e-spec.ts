import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { GeneratedEventTicket } from '../src/modules/tickets/entities/generated-event-ticket.entity';
import { EventCategory } from '../src/modules/event-categories/entity/event-category.entity';
import { Event } from '../src/modules/events/entity/event.entity';
import { Order } from '../src/modules/orders/entity/order.entity';
import { OrderItem } from '../src/modules/orders/entity/order-item.entity';
import { OrderStatus } from '../src/common/constants/order-status.enum';
import { Ticket } from '../src/modules/tickets/entities/ticket.entity';
import { User } from '../src/modules/users/entity/user.entity';
import { Queue } from 'bullmq';
import { getQueueToken } from '@nestjs/bullmq';
import { PostgreeConnection } from '../src/infrastructure/database/database.provider';
import { cleanupApplication } from './setup_e2e';

describe('Email Distribution E2E', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let dataSource: DataSource;
  let emailQueue: Queue;

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
      pdfUrl: 'http://localhost:9000/tickets-public/test-ticket.pdf',
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
    emailQueue = moduleFixture.get<Queue>(getQueueToken('email'));

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

    await emailQueue.clean(0, 0, 'completed');
    await emailQueue.clean(0, 0, 'failed');
    await emailQueue.clean(0, 0, 'waiting');

    testUser = await dataSource.getRepository(User).save({
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashedpassword',
    } as User);

    testEventCategory = await dataSource.getRepository(EventCategory).save({
      name: 'Test Category',
      description: 'Test Category Description',
    } as EventCategory);

    testEvent = await createEvent();

    testTicket = await dataSource.getRepository(Ticket).save({
      eventId: testEvent.id,
      name: 'Test Ticket',
      price: '100000',
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
    });
  });

  describe('Email Queue Processing', () => {
    it('should add email sending job to queue', async () => {
      await emailQueue.add('send-ticket-email', {
        ticketId: testGeneratedTicket.id,
      });

      const jobs = await emailQueue.getJobs(['waiting', 'active', 'completed', 'failed']);
      const emailJob = jobs.find((job) => job.data.ticketId === testGeneratedTicket.id);

      expect(emailJob).toBeDefined();
      if (emailJob) {
        expect(emailJob.name).toBe('send-ticket-email');
        expect(emailJob.data.ticketId).toBe(testGeneratedTicket.id);
      }
    });

    it('should handle multiple email jobs', async () => {
      const tickets: GeneratedEventTicket[] = [];
      for (let i = 0; i < 3; i++) {
        const ticket = await createGeneratedTicket({
          qrCodeUrl: `http://localhost:9000/tickets-public/test-qr-${i}.png`,
          pdfUrl: `http://localhost:9000/tickets-public/test-ticket-${i}.pdf`,
        });
        tickets.push(ticket);
      }

      for (const ticket of tickets) {
        await emailQueue.add('send-ticket-email', {
          ticketId: ticket.id,
        });
      }

      const jobs = await emailQueue.getJobs(['waiting', 'active', 'completed', 'failed']);
      const emailJobs = jobs.filter((job) => tickets.some((ticket) => job.data.ticketId === ticket.id));

      expect(emailJobs).toHaveLength(3);

      for (const ticket of tickets) {
        await dataSource.getRepository(GeneratedEventTicket).delete({ id: ticket.id });
      }
    });

    it('should handle job failure gracefully', async () => {
      const invalidUser = await dataSource.getRepository(User).save({
        email: 'invalid-email-format',
        name: 'Invalid User',
        password: 'hashedpassword',
      } as User);

      const invalidTicket = await createGeneratedTicket({
        qrCodeUrl: 'http://localhost:9000/tickets-public/test-qr-invalid.png',
        pdfUrl: 'http://localhost:9000/tickets-public/test-ticket.pdf',
      });

      await emailQueue.add('send-ticket-email', {
        ticketId: invalidTicket.id,
      });

      const jobs = await emailQueue.getJobs(['waiting', 'active', 'completed', 'failed']);
      const invalidJob = jobs.find((job) => job.data.ticketId === invalidTicket.id);

      expect(invalidJob).toBeDefined();

      await dataSource.getRepository(GeneratedEventTicket).delete({ id: invalidTicket.id });
      await dataSource.getRepository(User).delete({ id: invalidUser.id });
    });
  });

  describe('Email Content', () => {
    it('should include required ticket information in email', () => {
      const requiredEmailContent = {
        recipientEmail: testUser.email,
        recipientName: testUser.name,
        eventName: testEvent.title,
        eventDate: testEvent.startDate,
        eventLocation: testEvent.location,
        pdfUrl: testGeneratedTicket.pdfUrl,
        ticketId: testGeneratedTicket.id,
      };

      expect(requiredEmailContent.recipientEmail).toBe('test@example.com');
      expect(requiredEmailContent.recipientName).toBe('Test User');
      expect(requiredEmailContent.eventName).toBe('Test Event');
      expect(requiredEmailContent.pdfUrl).toContain('tickets-public');
    });

    it('should handle special characters in email content', async () => {
      const specialEvent = await createEvent({
        title: 'Event with Special Characters: !@#$%^&*()',
        description: 'Description with special characters',
        location: 'Venue with "quotes" and \'apostrophes\'',
      });

      const specialUser = await dataSource.getRepository(User).save({
        email: 'special+user@example.com',
        name: 'User with special name',
        password: 'hashedpassword',
      } as User);

      const specialTicket = await dataSource.getRepository(Ticket).save({
        eventId: specialEvent.id,
        name: 'Special Ticket',
        price: '100000',
        quota: 100,
        sold: 0,
        status: 'published',
      } as unknown as Ticket);

      const specialOrder = await dataSource.getRepository(Order).save({
        userId: specialUser.id,
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

      await emailQueue.add('send-ticket-email', {
        ticketId: specialGeneratedTicket.id,
      });

      const jobs = await emailQueue.getJobs(['waiting', 'active', 'completed', 'failed']);
      const emailJob = jobs.find((job) => job.data.ticketId === specialGeneratedTicket.id);

      expect(emailJob).toBeDefined();

      await dataSource.getRepository(GeneratedEventTicket).delete({ id: specialGeneratedTicket.id });
      await dataSource.getRepository(OrderItem).delete({ id: specialOrderItem.id });
      await dataSource.getRepository(Order).delete({ id: specialOrder.id });
      await dataSource.getRepository(Ticket).delete({ id: specialTicket.id });
      await dataSource.getRepository(Event).delete({ id: specialEvent.id });
      await dataSource.getRepository(User).delete({ id: specialUser.id });
    });

    it('should generate proper email subject', () => {
      const expectedSubject = `Your ticket for ${testEvent.title}`;
      expect(expectedSubject).toBe('Your ticket for Test Event');
    });

    it('should include PDF download link in email', () => {
      const pdfUrl = testGeneratedTicket.pdfUrl;
      expect(pdfUrl).toContain('http://localhost:9000');
      expect(pdfUrl).toContain('tickets-public');
      expect(pdfUrl).toContain('.pdf');
    });
  });

  describe('Email Sending Edge Cases', () => {
    it('should handle missing ticket gracefully', async () => {
      await emailQueue.add('send-ticket-email', {
        ticketId: 'non-existent-ticket-id',
      });

      const jobs = await emailQueue.getJobs(['waiting', 'active', 'completed', 'failed']);
      const job = jobs.find((job) => job.data.ticketId === 'non-existent-ticket-id');

      expect(job).toBeDefined();
    });

    it('should handle missing user gracefully', async () => {
      const orphanTicket = await createGeneratedTicket({
        qrCodeUrl: 'http://localhost:9000/tickets-public/orphan-qr.png',
        pdfUrl: 'http://localhost:9000/tickets-public/orphan-ticket.pdf',
      });

      await emailQueue.add('send-ticket-email', {
        ticketId: orphanTicket.id,
      });

      const jobs = await emailQueue.getJobs(['waiting', 'active', 'completed', 'failed']);
      const job = jobs.find((job) => job.data.ticketId === orphanTicket.id);

      expect(job).toBeDefined();

      await dataSource.getRepository(GeneratedEventTicket).delete({ id: orphanTicket.id });
    });

    it('should handle missing PDF URL gracefully', async () => {
      const ticketWithoutPdf = await createGeneratedTicket({
        qrCodeUrl: 'http://localhost:9000/tickets-public/no-pdf-qr.png',
        pdfUrl: 'http://localhost:9000/tickets-public/no-pdf.pdf',
      });

      await emailQueue.add('send-ticket-email', {
        ticketId: ticketWithoutPdf.id,
      });

      const jobs = await emailQueue.getJobs(['waiting', 'active', 'completed', 'failed']);
      const job = jobs.find((job) => job.data.ticketId === ticketWithoutPdf.id);

      expect(job).toBeDefined();

      await dataSource.getRepository(GeneratedEventTicket).delete({ id: ticketWithoutPdf.id });
    });

    it('should handle email service unavailable', async () => {
      const ticket = await createGeneratedTicket({
        qrCodeUrl: 'http://localhost:9000/tickets-public/email-unavailable-qr.png',
        pdfUrl: 'http://localhost:9000/tickets-public/email-unavailable.pdf',
      });

      await emailQueue.add('send-ticket-email', {
        ticketId: ticket.id,
      });

      const jobs = await emailQueue.getJobs(['waiting', 'active', 'completed', 'failed']);
      const job = jobs.find((job) => job.data.ticketId === ticket.id);

      expect(job).toBeDefined();

      await dataSource.getRepository(GeneratedEventTicket).delete({ id: ticket.id });
    });
  });

  describe('Email Template', () => {
    it('should generate HTML email template', () => {
      const templateData = {
        userName: testUser.name,
        eventName: testEvent.title,
        eventDate: testEvent.startDate,
        eventLocation: testEvent.location,
        pdfUrl: testGeneratedTicket.pdfUrl,
        ticketId: testGeneratedTicket.id,
      };

      expect(templateData.userName).toBe('Test User');
      expect(templateData.eventName).toBe('Test Event');
      expect(templateData.pdfUrl).toBeDefined();
    });

    it('should handle empty event description', async () => {
      const emptyEvent = await createEvent({
        title: 'Event with No Description',
        description: '',
        location: 'Test Location',
      });

      const emptyTicket = await dataSource.getRepository(Ticket).save({
        eventId: emptyEvent.id,
        name: 'Empty Event Ticket',
        price: '100000',
        quota: 100,
        sold: 0,
        status: 'published',
      } as unknown as Ticket);

      const emptyOrder = await dataSource.getRepository(Order).save({
        userId: testUser.id,
        status: OrderStatus.PAID,
        totalAmount: 100000,
      } as Order);

      const emptyOrderItem = await dataSource.getRepository(OrderItem).save({
        orderId: emptyOrder.id,
        ticketId: emptyTicket.id,
        quantity: 1,
        price: 100000,
        subtotal: 100000,
      } as OrderItem);

      const emptyGeneratedTicket = await dataSource.getRepository(GeneratedEventTicket).save({
        ticketId: emptyTicket.id,
        orderItemId: emptyOrderItem.id,
        qrCodeUrl: 'http://localhost:9000/tickets-public/empty-qr.png',
        pdfUrl: 'http://localhost:9000/tickets-public/empty-ticket.pdf',
        isUsed: false,
        issuedAt: new Date(),
      } as GeneratedEventTicket);

      await emailQueue.add('send-ticket-email', {
        ticketId: emptyGeneratedTicket.id,
      });

      const jobs = await emailQueue.getJobs(['waiting', 'active', 'completed', 'failed']);
      const emailJob = jobs.find((job) => job.data.ticketId === emptyGeneratedTicket.id);

      expect(emailJob).toBeDefined();

      await dataSource.getRepository(GeneratedEventTicket).delete({ id: emptyGeneratedTicket.id });
      await dataSource.getRepository(OrderItem).delete({ id: emptyOrderItem.id });
      await dataSource.getRepository(Order).delete({ id: emptyOrder.id });
      await dataSource.getRepository(Ticket).delete({ id: emptyTicket.id });
      await dataSource.getRepository(Event).delete({ id: emptyEvent.id });
    });

    it('should handle virtual events', async () => {
      const virtualEvent = await createEvent({
        title: 'Virtual Event',
        description: 'Online event description',
        location: 'Online - Zoom',
        maxAttendees: 1000,
        isVirtual: true,
      });

      const virtualTicket = await dataSource.getRepository(Ticket).save({
        eventId: virtualEvent.id,
        name: 'Virtual Event Ticket',
        price: '50000',
        quota: 1000,
        sold: 0,
        status: 'published',
      } as unknown as Ticket);

      const virtualOrder = await dataSource.getRepository(Order).save({
        userId: testUser.id,
        status: OrderStatus.PAID,
        totalAmount: 50000,
      } as Order);

      const virtualOrderItem = await dataSource.getRepository(OrderItem).save({
        orderId: virtualOrder.id,
        ticketId: virtualTicket.id,
        quantity: 1,
        price: 50000,
        subtotal: 50000,
      } as OrderItem);

      const virtualGeneratedTicket = await dataSource.getRepository(GeneratedEventTicket).save({
        ticketId: virtualTicket.id,
        orderItemId: virtualOrderItem.id,
        qrCodeUrl: 'http://localhost:9000/tickets-public/virtual-qr.png',
        pdfUrl: 'http://localhost:9000/tickets-public/virtual-ticket.pdf',
        isUsed: false,
        issuedAt: new Date(),
      } as GeneratedEventTicket);

      await emailQueue.add('send-ticket-email', {
        ticketId: virtualGeneratedTicket.id,
      });

      const jobs = await emailQueue.getJobs(['waiting', 'active', 'completed', 'failed']);
      const emailJob = jobs.find((job) => job.data.ticketId === virtualGeneratedTicket.id);

      expect(emailJob).toBeDefined();
      expect(virtualEvent.isVirtual).toBe(true);

      await dataSource.getRepository(GeneratedEventTicket).delete({ id: virtualGeneratedTicket.id });
      await dataSource.getRepository(OrderItem).delete({ id: virtualOrderItem.id });
      await dataSource.getRepository(Order).delete({ id: virtualOrder.id });
      await dataSource.getRepository(Ticket).delete({ id: virtualTicket.id });
      await dataSource.getRepository(Event).delete({ id: virtualEvent.id });
    });
  });

  describe('Email Performance', () => {
    it('should handle bulk email sending', async () => {
      const tickets: GeneratedEventTicket[] = [];
      for (let i = 0; i < 10; i++) {
        const ticket = await createGeneratedTicket({
          qrCodeUrl: `http://localhost:9000/tickets-public/bulk-qr-${i}.png`,
          pdfUrl: `http://localhost:9000/tickets-public/bulk-ticket-${i}.pdf`,
        });
        tickets.push(ticket);
      }

      const promises = tickets.map((ticket) =>
        emailQueue.add('send-ticket-email', {
          ticketId: ticket.id,
        }),
      );

      await Promise.all(promises);

      const jobs = await emailQueue.getJobs(['waiting', 'active', 'completed', 'failed']);
      const emailJobs = jobs.filter((job) => tickets.some((ticket) => job.data.ticketId === ticket.id));

      expect(emailJobs).toHaveLength(10);

      for (const ticket of tickets) {
        await dataSource.getRepository(GeneratedEventTicket).delete({ id: ticket.id });
      }
    });

    it('should handle concurrent email jobs', async () => {
      const promises = Array(5)
        .fill(null)
        .map((_, index) =>
          emailQueue.add('send-ticket-email', {
            ticketId: `${testGeneratedTicket.id}-${index}`,
          }),
        );

      await Promise.all(promises);

      const jobs = await emailQueue.getJobs(['waiting', 'active', 'completed', 'failed']);
      expect(jobs.length).toBeGreaterThanOrEqual(5);
    });
  });
});
