import { Test, TestingModule } from '@nestjs/testing';
import { REPOSITORY } from '~/common/constants/database';
import { OrderStatus } from '~/common/constants/order-status.enum';
import { PaymentStatus, PaymentMethod } from '~/modules/payments/payment.enum';
import { PaymentService } from '~/modules/payments/payment.service';
import { OrderService } from './order.service';
import { Order } from './entity/order.entity';
import { OrderItem } from './entity/order-item.entity';
import { Ticket } from '~/modules/tickets/entity/ticket.entity';
import { GeneratedEventTicket } from '~/modules/tickets/entity/generated-event-ticket.entity';

describe('OrderService', () => {
  let service: OrderService;

  const orderItemRepo: any = {
    create: jest.fn((value) => ({ ...value })),
    save: jest.fn(async (value) => value),
    count: jest.fn(),
  };

  const ticketRepo: any = {
    findOne: jest.fn(),
    save: jest.fn(async (value) => value),
  };

  const generatedTicketRepo: any = {
    create: jest.fn((value) => ({ ...value, id: value.id ?? 'generated-1' })),
    save: jest.fn(async (value) => value),
    count: jest.fn().mockResolvedValue(0),
  };

  let orderRepo: any;

  const paymentService: any = {
    createInvoice: jest.fn(),
    getTransactionByExternalId: jest.fn(),
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
      create: jest.fn((value: unknown) => ({ ...(value as object) })),
      save: jest.fn(async (value: any) => ({ ...value, id: value.id ?? 'order-1', createdAt: value.createdAt ?? '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' })),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
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
          provide: REPOSITORY.GENERATED_EVENT_TICKET,
          useValue: generatedTicketRepo,
        },
        {
          provide: PaymentService,
          useValue: paymentService,
        },
        {
          provide: 'PinoLogger:OrderService',
          useValue: {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(OrderService);
  });

  it('creates an order, locks quota, and creates a payment invoice', async () => {
    ticketRepo.findOne.mockResolvedValue({
      id: 'ticket-1',
      quota: 10,
      sold: 2,
      price: 50000,
      name: 'VIP',
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
});
