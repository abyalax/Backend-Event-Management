/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Test, TestingModule } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';
import { REPOSITORY } from '~/common/constants/database';
import { OrderStatus } from '~/common/constants/order-status.enum';
import { PaymentStatus, PaymentMethod } from '~/modules/payments/payment.enum';
import { PaymentService } from '~/modules/payments/payment.service';
import { OrderService } from './order.service';
import { Order } from './entity/order.entity';
import { OrderItem } from './entity/order-item.entity';
import { Ticket } from '~/modules/tickets/entities/ticket.entity';
import { GeneratedEventTicket } from '~/modules/tickets/entities/generated-event-ticket.entity';
import { QRService } from '../qr-code/qr-code.service';
import { EmailService } from '~/infrastructure/email/email.service';
import { mockConfigService, mockEmailService, mockPdfService, mockStorageService } from '~/test/common/mock';
import { StorageService } from '~/infrastructure/storage/storage.service';
import { PdfService } from '../pdf/pdf.service';
import { CONFIG_SERVICE } from '~/infrastructure/config/config.provider';

describe('OrderService', () => {
  let service: OrderService;

  const orderItemRepo = {
    create: jest.fn((value) => ({ ...value })),
    save: jest.fn((value) => value),
    count: jest.fn(),
  };

  const ticketRepo = {
    findOne: jest.fn(),
    save: jest.fn((value) => value),
  };

  const generatedTicketRepo = {
    create: jest.fn((value) => ({ ...value, id: value.id ?? 'generated-1' })),
    save: jest.fn((value) => value),
    count: jest.fn().mockResolvedValue(0),
  };

  let orderRepo: any;

  const paymentService = {
    createInvoice: jest.fn(),
    getTransactionByExternalId: jest.fn(),
  };

  const eventRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    orderRepo = {
      manager: {
        transaction: jest.fn(async (callback: (manager: { getRepository: (entity: unknown) => unknown }) => Promise<void>) =>
          callback({
            getRepository: (entity: unknown): unknown => {
              if (entity === Order) return orderRepo;
              if (entity === OrderItem) return orderItemRepo;
              if (entity === Ticket) return ticketRepo;
              if (entity === GeneratedEventTicket) return generatedTicketRepo;
              return undefined;
            },
          }),
        ),
      },
      create: jest.fn((value: any) => ({ ...value })),
      save: jest.fn((value: any) => ({
        ...value,
        id: value.id ?? 'order-1',
        createdAt: value.createdAt ?? '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      })),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        QRService,
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
        {
          provide: PdfService,
          useValue: mockPdfService,
        },
        {
          provide: CONFIG_SERVICE,
          useValue: mockConfigService,
        },
        {
          provide: PinoLogger,
          useValue: {
            setContext: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
          },
        },
        {
          provide: REPOSITORY.ORDER,
          useValue: orderRepo,
        },
        {
          provide: REPOSITORY.ORDER_ITEM,
          useValue: orderItemRepo,
        },
        {
          provide: REPOSITORY.TICKET,
          useValue: ticketRepo,
        },
        {
          provide: REPOSITORY.EVENT,
          useValue: eventRepo,
        },
        {
          provide: REPOSITORY.GENERATED_EVENT_TICKET,
          useValue: generatedTicketRepo,
        },
        {
          provide: PaymentService,
          useValue: paymentService,
        },
      ],
    }).compile();

    service = module.get(OrderService);
  });

  it('creates an order, locks quota, and creates a payment invoice', async () => {
    ticketRepo.findOne.mockResolvedValue({
      id: 'ticket-1',
      eventId: 'event-1',
      quota: 10,
      sold: 2,
      price: 50000,
      name: 'VIP',
    });

    eventRepo.findOne.mockResolvedValue({
      id: 'event-1',
      title: 'Concert',
    });

    orderRepo.findOne.mockResolvedValue({
      id: 'order-1',
      userId: 'user-1',
      totalAmount: 50000,
      status: OrderStatus.PENDING,
      expiredAt: new Date('2026-01-01T00:15:00.000Z'),
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      orderItems: [
        {
          id: 'order-item-1',
          orderId: 'order-1',
          ticketId: 'ticket-1',
          quantity: 1,
          price: 50000,
          subtotal: 50000,
          ticket: {
            id: 'ticket-1',
            name: 'VIP',
          },
          generatedTickets: [],
        },
      ],
    });

    paymentService.createInvoice.mockResolvedValue({
      id: 'txn-1',
      externalId: 'order-1',
      status: PaymentStatus.PENDING,
      amount: 50000,
      paymentMethod: PaymentMethod.INVOICE,
      paymentUrl: 'https://payment.example/invoice',
      paidAt: null,
      expiresAt: null,
    });

    paymentService.getTransactionByExternalId.mockResolvedValue({
      id: 'txn-1',
      externalId: 'order-1',
      status: PaymentStatus.PENDING,
      amount: 50000,
      paymentMethod: PaymentMethod.INVOICE,
      paymentUrl: 'https://payment.example/invoice',
      paidAt: null,
      expiresAt: null,
    });

    const result = await service.createOrder(
      {
        items: [{ ticketId: 'ticket-1', quantity: 1 }],
        description: 'Concert tickets',
      },
      'user-1',
      'user@example.com',
    );

    expect(paymentService.createInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        externalId: 'order-1',
        amount: 50000,
        payerEmail: 'user@example.com',
        description: 'Concert tickets',
      }),
    );
    expect(ticketRepo.save).toHaveBeenCalledWith(expect.objectContaining({ sold: 3 }));
    expect(result.id).toBe('order-1');
    expect(result.status).toBe(OrderStatus.PENDING);
    expect(result.payment?.externalId).toBe('order-1');
    expect(result.items).toHaveLength(1);
  });

  it('rejects tickets that do not belong to the requested event', async () => {
    eventRepo.findOne.mockResolvedValue({
      id: 'event-1',
      title: 'Concert',
    });

    ticketRepo.findOne.mockResolvedValue({
      id: 'ticket-1',
      eventId: 'event-2',
      quota: 10,
      sold: 0,
      price: 50000,
      name: 'VIP',
    });

    await expect(
      service.createOrder(
        {
          eventId: 'event-1',
          items: [{ ticketId: 'ticket-1', quantity: 1 }],
        },
        'user-1',
        'user@example.com',
      ),
    ).rejects.toThrow('does not belong to event');
  });
});
