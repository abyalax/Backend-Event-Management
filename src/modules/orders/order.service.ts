import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { In, LessThan, Repository } from 'typeorm';
import { paginate, PaginateQuery } from 'nestjs-paginate';
import { randomUUID } from 'node:crypto';
import { REPOSITORY } from '~/common/constants/database';
import { ORDER_STATUS_TRANSITIONS, ORDER_TTL_MINUTES, OrderStatus } from '~/common/constants/order-status.enum';
import { PaymentService } from '~/modules/payments/payment.service';
import { GeneratedEventTicket } from '~/modules/tickets/entities/generated-event-ticket.entity';
import { Ticket } from '~/modules/tickets/entities/ticket.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderItemResponseDto, OrderResponseDto } from './dto/order-response.dto';
import { OrderStatusResponseDto } from './dto/order-status-response.dto';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { ORDER_PAGINATION_CONFIG } from './order-pagination.config';
import { EwalletType, PaymentMethod, PaymentStatus } from '~/modules/payments/payment.enum';
import type { Transaction } from '~/modules/payments/entities/transaction.entity';
import { QueryUserOrdersDto } from './dto/query-user-orders.dto';
import QRCode from 'qrcode';
import { DashboardCacheService } from '~/modules/dashboard/dashboard-cache.service';
import { ReminderService } from '~/modules/reminders/reminder.service';
import { ClockProvider } from '~/infrastructure/clock/clock.provider';
import { PdfService } from '~/modules/pdf/pdf.service';
import { TicketLockService } from '~/infrastructure/cache/ticket-lock.service';

type LoadedOrder = Order & {
  orderItems?: Array<
    OrderItem & {
      ticket?: Ticket;
      generatedTickets?: GeneratedEventTicket[];
    }
  >;
};

export type OrderRelationProfile = 'summary' | 'response' | 'paymentProcessing' | 'ticketGeneration';
export type OrderRelations = OrderRelationProfile | string[];

const ORDER_RELATION_PROFILES: Record<OrderRelationProfile, string[]> = {
  summary: [],
  response: ['orderItems', 'orderItems.ticket', 'orderItems.generatedTickets'],
  paymentProcessing: ['orderItems', 'orderItems.ticket', 'orderItems.ticket.event'],
  ticketGeneration: ['user', 'orderItems', 'orderItems.ticket', 'orderItems.ticket.event'],
};

@Injectable()
export class OrderService {
  constructor(
    private readonly logger: PinoLogger,

    @Inject(REPOSITORY.ORDER)
    private readonly orderRepository: Repository<Order>,

    @Inject(REPOSITORY.TICKET)
    private readonly ticketRepository: Repository<Ticket>,

    @Inject(REPOSITORY.GENERATED_EVENT_TICKET)
    private readonly generatedTicketRepository: Repository<GeneratedEventTicket>,

    @Inject(REPOSITORY.TRANSACTION)
    private readonly transactionRepository: Repository<Transaction>,

    private readonly paymentService: PaymentService,
    private readonly pdfService: PdfService,
    private readonly ticketLockService: TicketLockService,
    private readonly dashboardCacheService: DashboardCacheService,
    private readonly reminderService: ReminderService,
  ) {}

  async createOrder(dto: CreateOrderDto, userId: string, userEmail: string): Promise<OrderResponseDto> {
    if (!dto.items?.length) throw new BadRequestException('At least one ticket item is required');

    const now = ClockProvider.now();
    const expiration = new Date(now.getTime() + ORDER_TTL_MINUTES * 60 * 1000);

    let createdOrder: Order | undefined;
    const lockedTicketIds: string[] = [];

    this.logger.debug('Creating Orders');
    try {
      await this.orderRepository.manager.transaction(async (manager) => {
        const orderRepo = manager.getRepository(Order);
        const orderItemRepo = manager.getRepository(OrderItem);
        const ticketRepo = manager.getRepository(Ticket);

        const order = orderRepo.create({
          userId,
          totalAmount: 0,
          status: OrderStatus.PENDING,
          expiredAt: expiration,
        });

        createdOrder = await orderRepo.save(order);

        const orderItems: OrderItem[] = [];
        let totalAmount = 0;

        for (const item of dto.items) {
          const quantity = Number(item.quantity);
          if (!Number.isInteger(quantity) || quantity < 1) throw new BadRequestException(`Invalid quantity for ticket ${item.ticketId}`);

          const ticket = await ticketRepo.findOne({
            where: { id: item.ticketId },
            lock: { mode: 'pessimistic_write' },
          });

          if (!ticket) throw new NotFoundException(`Ticket ${item.ticketId} not found`);

          if (dto.eventId && ticket.eventId !== dto.eventId)
            throw new BadRequestException(`Ticket ${ticket.id} does not belong to event ${dto.eventId}`);

          const remaining = Number(ticket.quota) - Number(ticket.sold ?? 0);

          if (remaining < quantity) throw new BadRequestException(`Insufficient quota for ticket ${ticket.id}`);

          await this.ticketLockService.initializeQuotaIfAbsent(ticket.id, remaining);
          const locked = await this.ticketLockService.lockTicketQuota(ticket.id, createdOrder.id, quantity);
          if (!locked) throw new BadRequestException(`Insufficient quota for ticket ${ticket.id}`);
          lockedTicketIds.push(ticket.id);

          const price = Number(ticket.price);
          const subtotal = price * quantity;
          totalAmount += subtotal;

          orderItems.push(
            orderItemRepo.create({
              orderId: createdOrder.id,
              ticketId: ticket.id,
              quantity,
              price,
              subtotal,
              ticket,
            }),
          );
        }

        createdOrder.totalAmount = Number(totalAmount.toFixed(2));
        await orderRepo.save(createdOrder);
        await orderItemRepo.save(orderItems);
      });
    } catch (error) {
      if (createdOrder) await this.releaseRedisLocks(createdOrder.id, lockedTicketIds);
      throw error;
    }

    if (!createdOrder) throw new Error('Failed to create order');

    try {
      const payment = await this.createPaymentForOrder(createdOrder, dto, userEmail);

      if ([PaymentStatus.PAID, PaymentStatus.SETTLED].includes(payment.status)) {
        await this.handleSuccessfulPayment(createdOrder.id);
        // Invalidate dashboard cache when payment is successful
        await this.dashboardCacheService.invalidate();
      }
    } catch (error) {
      this.logger.error({ orderId: createdOrder.id, error }, 'Payment creation failed, cancelling order');
      await this.cancelOrderInternal(createdOrder.id, true);
      throw error;
    }

    const order = await this.findOrderById(createdOrder.id, userId, 'response');
    const payment = await this.getPaymentByOrderId(order.id);
    return this.toOrderResponse(order, payment);
  }

  async getOrderPaymentQris(id: string, userId: string): Promise<{ orderId: string; qrCodeDataUrl: string; qrString: string }> {
    const order = await this.findOrderById(id, userId, 'summary');
    const payment = await this.getPaymentByOrderId(order.id);

    if (payment?.paymentMethod !== PaymentMethod.QRIS || !payment.paymentUrl)
      throw new BadRequestException('QRIS payment is not available for this order');

    const qrCodeDataUrl = await QRCode.toDataURL(payment.paymentUrl, {
      margin: 1,
      width: 280,
    });

    return {
      orderId: order.id,
      qrCodeDataUrl,
      qrString: payment.paymentUrl,
    };
  }

  async getOrderById(id: string, userId: string): Promise<OrderResponseDto> {
    const order = await this.findOrderById(id, userId, 'response');
    const payment = await this.getPaymentByOrderId(order.id);
    return this.toOrderResponse(order, payment);
  }

  async getOrderStatus(id: string, userId: string): Promise<OrderStatusResponseDto> {
    const order = await this.findOrderById(id, userId, 'summary');
    const payment = await this.getPaymentByOrderId(order.id);

    return {
      orderId: order.id,
      status: order.status,
      paymentStatus: payment?.status ?? null,
      paymentUrl: payment?.paymentUrl ?? null,
      expiredAt: order.expiredAt ?? null,
    };
  }

  async getOrderTickets(id: string, userId: string) {
    const order = await this.findOrderById(id, userId, 'summary');
    if (![OrderStatus.PAID].includes(order.status)) {
      const payment = await this.getPaymentByOrderId(order.id);
      if (payment?.status !== PaymentStatus.SETTLED) {
        throw new BadRequestException('Tickets are only available after the order is paid');
      }
    }

    return await this.listGeneratedTicketsForOrder(order.id);
  }

  async cancelOrder(id: string, userId: string): Promise<OrderResponseDto> {
    const order = await this.findOrderById(id, userId, 'summary');
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Only pending orders can be cancelled');
    }

    await this.cancelOrderInternal(id, false);
    const updated = await this.findOrderById(id, userId, 'response');
    const payment = await this.getPaymentByOrderId(updated.id);
    return this.toOrderResponse(updated, payment);
  }

  async getUserOrders(userId: string, query: QueryUserOrdersDto) {
    const sortBy: [string, string][] = query.sort_by && query.sort_order ? [[query.sort_by, query.sort_order]] : [['updatedAt', 'DESC']];
    const mappedQuery: PaginateQuery = {
      page: query.page,
      limit: query.limit,
      search: query.search,
      sortBy,
      path: '',
      filter: {
        userId,
      },
    };

    const paginatedOrders = await paginate(mappedQuery, this.orderRepository, ORDER_PAGINATION_CONFIG);
    const orderIds = paginatedOrders.data.map((order) => order.id);
    const payments = orderIds.length
      ? await this.transactionRepository.find({
          where: {
            externalId: In(orderIds),
          },
        })
      : [];
    const paymentsByOrderId = new Map(payments.map((payment) => [payment.externalId, payment]));

    const ordersWithPayment = await Promise.all(
      paginatedOrders.data.map((order) => this.toOrderResponse(order, paymentsByOrderId.get(order.id) ?? null)),
    );

    return {
      meta: paginatedOrders.meta,
      links: paginatedOrders.links,
      data: ordersWithPayment,
    };
  }

  async findOrderById(orderId: string, userId?: string): Promise<LoadedOrder>;
  async findOrderById(orderId: string, userId: string | undefined, relations: OrderRelations): Promise<LoadedOrder>;
  async findOrderById(orderId: string, userId?: string, relations: OrderRelations = 'response'): Promise<LoadedOrder> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: this.resolveOrderRelations(relations),
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (userId && order.userId !== userId) {
      throw new ForbiddenException('You are not allowed to access this order');
    }

    return order;
  }

  async findExpiredPendingOrders(): Promise<Order[]> {
    return this.orderRepository.find({
      where: {
        status: OrderStatus.PENDING,
        expiredAt: LessThan(ClockProvider.now()),
      },
      order: { expiredAt: 'ASC' },
      take: 100,
    });
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
    const order = await this.findOrderById(orderId, undefined, 'summary');
    if (order.status === status) {
      return order;
    }

    const allowed = ORDER_STATUS_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(status) && order.status !== status) {
      throw new BadRequestException(`Cannot transition order ${orderId} from ${order.status} to ${status}`);
    }

    order.status = status;
    const saved = await this.orderRepository.save(order);

    if (status === OrderStatus.EXPIRED || status === OrderStatus.CANCELLED) {
      await this.releaseTicketQuotas(orderId);
    }

    return saved;
  }

  async updateOrderExpiration(orderId: string, expiredAt: Date): Promise<Order> {
    const order = await this.findOrderById(orderId, undefined, 'summary');
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Only pending orders can update expiration');
    }

    order.expiredAt = expiredAt;
    return this.orderRepository.save(order);
  }

  async releaseTicketQuotas(orderId: string): Promise<void> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['orderItems'],
    });

    if (!order?.orderItems?.length) return;

    const quantityByTicketId = new Map<string, number>();

    for (const item of order.orderItems) {
      quantityByTicketId.set(item.ticketId, (quantityByTicketId.get(item.ticketId) ?? 0) + Number(item.quantity));
    }

    if (quantityByTicketId.size === 0) return;

    await this.orderRepository.manager.transaction(async (manager) => {
      if (order.status === OrderStatus.PAID) {
        for (const [ticketId, quantity] of quantityByTicketId) {
          await manager
            .createQueryBuilder()
            .update(Ticket)
            .set({ sold: () => `GREATEST(sold - ${quantity}, 0)` })
            .where('id = :ticketId', { ticketId })
            .execute();
        }
      }
    });

    for (const ticketId of quantityByTicketId.keys()) {
      await this.ticketLockService.releaseTicketQuota(ticketId, orderId);
    }
  }

  async generateTicketsForOrder(orderId: string): Promise<GeneratedEventTicket[]> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ORDER_RELATION_PROFILES.ticketGeneration,
    });

    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    if (![OrderStatus.PAID].includes(order.status)) {
      const payment = await this.getPaymentByOrderId(orderId);
      if (payment?.status !== PaymentStatus.SETTLED) {
        throw new BadRequestException(`Order ${orderId} is not paid`);
      }
    }

    const generatedTickets: GeneratedEventTicket[] = [];
    const orderItemIds = (order.orderItems ?? []).map((orderItem) => orderItem.id);
    const existingCountsRaw =
      orderItemIds.length > 0
        ? await this.generatedTicketRepository
            .createQueryBuilder('generatedTicket')
            .select('generatedTicket.orderItemId', 'orderItemId')
            .addSelect('COUNT(generatedTicket.id)', 'count')
            .where('generatedTicket.orderItemId IN (:...orderItemIds)', { orderItemIds })
            .groupBy('generatedTicket.orderItemId')
            .getRawMany<{ orderItemId: string; count: string }>()
        : [];
    const existingCountByOrderItemId = new Map(existingCountsRaw.map((row) => [row.orderItemId, Number(row.count)]));

    for (const orderItem of order.orderItems ?? []) {
      const existingCount = existingCountByOrderItemId.get(orderItem.id) ?? 0;

      const ticketsToCreate = Math.max(0, Number(orderItem.quantity) - existingCount);
      const ticketsToPersist: GeneratedEventTicket[] = [];

      for (let index = 0; index < ticketsToCreate; index += 1) {
        const ticket = this.generatedTicketRepository.create({
          id: randomUUID(),
          orderItemId: orderItem.id,
          ticketId: orderItem.ticketId,
          qrCodeUrl: 'pending',
          pdfUrl: 'pending',
          isUsed: false,
          issuedAt: new Date(),
        });

        const qrCodePayload = await this.pdfService.generateTicketQrPayload(ticket.id, orderItem.ticket.eventId);
        const pdfBuffer = await this.pdfService.generateGeneratedTicketPdf(ticket, orderItem.ticket, qrCodePayload);
        const pdfUrl = await this.pdfService.storeGeneratedTicketPdf(ticket.id, pdfBuffer);

        ticket.qrCodeUrl = qrCodePayload;
        ticket.pdfUrl = pdfUrl;
        ticketsToPersist.push(ticket);
      }

      if (ticketsToPersist.length > 0) {
        const persistedTickets = await this.generatedTicketRepository.save(ticketsToPersist);
        generatedTickets.push(...persistedTickets);
      }
    }

    // Send email to user with tickets
    if (generatedTickets.length > 0 && order.user?.email) {
      await this.pdfService.sendGeneratedTicketsEmail(order.user.email, order.id, generatedTickets);
    }

    if (generatedTickets.length > 0) {
      return generatedTickets;
    }

    return this.listGeneratedTicketsForOrder(orderId);
  }

  async handleSuccessfulPayment(orderId: string): Promise<void> {
    const order = await this.findOrderById(orderId, undefined, 'paymentProcessing');
    if (order.status !== OrderStatus.PENDING) return;

    const quantityByTicketId = new Map<string, number>();

    for (const orderItem of order.orderItems ?? []) {
      if (!orderItem.ticket) continue;

      quantityByTicketId.set(orderItem.ticket.id, (quantityByTicketId.get(orderItem.ticket.id) ?? 0) + Number(orderItem.quantity));
    }

    await this.orderRepository.manager.transaction(async (manager) => {
      for (const [ticketId, quantity] of quantityByTicketId) {
        const result = await manager
          .createQueryBuilder()
          .update(Ticket)
          .set({ sold: () => `sold + ${quantity}` })
          .where('id = :ticketId', { ticketId })
          .andWhere('sold + :quantity <= quota', { quantity })
          .execute();

        if (result.affected !== 1) throw new BadRequestException(`Insufficient quota for ticket ${ticketId}`);

        this.logger.info({ ticketId, quantity }, 'Ticket quota deducted after payment');
      }

      await manager.update(Order, { id: order.id, status: OrderStatus.PENDING }, { status: OrderStatus.PAID });
      order.status = OrderStatus.PAID;
    });

    for (const ticketId of quantityByTicketId.keys()) {
      await this.ticketLockService.confirmTicketQuota(ticketId, orderId);
    }

    // Now generate tickets after quota is deducted
    await this.generateTicketsForOrder(orderId);

    // Schedule reminders for paid orders with future events
    // Track scheduled events to avoid duplicate reminders for same event in one order
    const scheduledEventIds = new Set<string>();

    for (const orderItem of order.orderItems ?? []) {
      const event = orderItem.ticket?.event;

      if (event && new Date(event.startDate) > ClockProvider.now() && !scheduledEventIds.has(event.id)) {
        try {
          await this.reminderService.scheduleRemindersForOrder(orderId, event.id, order.userId);
          scheduledEventIds.add(event.id);
          this.logger.info({ orderId, eventId: event.id, userId: order.userId }, 'Reminders scheduled for paid order');
        } catch (error) {
          this.logger.error(
            {
              orderId,
              eventId: event.id,
              error: error instanceof Error ? error.message : String(error),
            },
            'Failed to schedule reminders',
          );
          // Don't fail the payment flow if reminder scheduling fails
        }
      }
    }
  }

  async handleExpiredPayment(orderId: string): Promise<void> {
    const order = await this.findOrderById(orderId, undefined, 'summary');
    if (order.status !== OrderStatus.PENDING) return;

    await this.updateOrderStatus(orderId, OrderStatus.EXPIRED);
  }

  async handleFailedPayment(orderId: string): Promise<void> {
    const order = await this.findOrderById(orderId, undefined, 'summary');
    if (order.status !== OrderStatus.PENDING) return;

    await this.updateOrderStatus(orderId, OrderStatus.CANCELLED);
  }

  async getPaymentByOrderId(orderId: string) {
    return this.paymentService.getTransactionByExternalId(orderId);
  }

  private async createPaymentForOrder(order: Order, dto: CreateOrderDto, userEmail: string): Promise<Transaction> {
    const paymentMethod = dto.paymentMethod ?? PaymentMethod.INVOICE;
    const description = dto.description ?? `Ticket order ${order.id}`;
    const successRedirectUrl = this.withOrderIdQuery(dto.successRedirectUrl, order.id);
    const failureRedirectUrl = this.withOrderIdQuery(dto.failureRedirectUrl, order.id);

    switch (paymentMethod) {
      case PaymentMethod.INVOICE:
        return this.paymentService.createInvoice({
          externalId: order.id,
          amount: order.totalAmount,
          payerEmail: userEmail,
          description,
          successRedirectUrl,
          failureRedirectUrl,
        });
      case PaymentMethod.QRIS:
        return this.paymentService.createQris({
          referenceId: order.id,
          amount: order.totalAmount,
          currency: 'IDR',
        });
      case PaymentMethod.EWALLET:
        return this.paymentService.createEwallet({
          referenceId: order.id,
          channelCode: dto.ewalletType ?? EwalletType.SHOPEEPAY,
          amount: order.totalAmount,
          currency: 'IDR',
          channelProperties: {
            successReturnUrl: successRedirectUrl,
            failureReturnUrl: failureRedirectUrl,
            cancelReturnUrl: failureRedirectUrl,
            pendingReturnUrl: successRedirectUrl,
          },
        });
      default:
        throw new BadRequestException(`Unsupported payment method: ${paymentMethod}`);
    }
  }

  private async cancelOrderInternal(orderId: string, dueToPaymentFailure: boolean): Promise<void> {
    const order = await this.findOrderById(orderId, undefined, 'summary');
    if (order.status !== OrderStatus.PENDING) return;

    order.status = OrderStatus.CANCELLED;
    await this.orderRepository.save(order);
    await this.releaseTicketQuotas(orderId);

    if (dueToPaymentFailure) {
      this.logger.warn({ orderId }, 'Order cancelled because payment creation failed');
    }
  }

  private withOrderIdQuery(redirectUrl: string | undefined, orderId: string): string | undefined {
    if (!redirectUrl) return undefined;

    try {
      const url = new URL(redirectUrl);
      url.searchParams.set('order_id', orderId);
      return url.toString();
    } catch {
      const separator = redirectUrl.includes('?') ? '&' : '?';
      return `${redirectUrl}${separator}order_id=${encodeURIComponent(orderId)}`;
    }
  }

  private toOrderResponse(order: LoadedOrder, transaction: Transaction | null): OrderResponseDto {
    return {
      id: order.id,
      userId: order.userId,
      totalAmount: Number(order.totalAmount),
      status: order.status,
      expiredAt: order.expiredAt ?? null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: (order.orderItems ?? []).map((item) => this.toOrderItemResponse(item)),
      payment: transaction
        ? {
            id: transaction.id,
            externalId: transaction.externalId,
            status: transaction.status,
            amount: Number(transaction.amount),
            paymentMethod: transaction.paymentMethod,
            paymentUrl: transaction.paymentUrl,
            paidAt: transaction.paidAt ?? null,
            expiresAt: transaction.expiresAt ?? null,
          }
        : null,
    };
  }

  private toOrderItemResponse(item: NonNullable<LoadedOrder['orderItems']>[number]): OrderItemResponseDto {
    return {
      id: item.id,
      ticketId: item.ticketId,
      ticketName: item.ticket?.name,
      quantity: Number(item.quantity),
      price: Number(item.price),
      subtotal: Number(item.subtotal),
      generatedTickets: (item.generatedTickets ?? []).map((ticket: GeneratedEventTicket) => ({
        id: ticket.id,
        qrCodeUrl: ticket.qrCodeUrl,
        pdfUrl: ticket.pdfUrl,
        isUsed: ticket.isUsed,
        issuedAt: ticket.issuedAt,
      })),
    };
  }

  private resolveOrderRelations(relations: OrderRelations): string[] {
    return Array.isArray(relations) ? relations : ORDER_RELATION_PROFILES[relations];
  }

  private async listGeneratedTicketsForOrder(orderId: string): Promise<GeneratedEventTicket[]> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['orderItems', 'orderItems.generatedTickets'],
    });

    if (!order?.orderItems?.length) {
      return [];
    }

    return order.orderItems.flatMap((item) => item.generatedTickets ?? []);
  }

  private async releaseRedisLocks(orderId: string, ticketIds: string[]): Promise<void> {
    await Promise.all(ticketIds.map((ticketId) => this.ticketLockService.releaseTicketQuota(ticketId, orderId)));
  }
}
