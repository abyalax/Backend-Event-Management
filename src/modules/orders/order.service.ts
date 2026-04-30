import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { LessThan, Repository } from 'typeorm';
import { paginate, PaginateQuery } from 'nestjs-paginate';
import { REPOSITORY } from '~/common/constants/database';
import { ORDER_STATUS_TRANSITIONS, ORDER_TTL_MINUTES, OrderStatus } from '~/common/constants/order-status.enum';
import { PaymentService } from '~/modules/payments/payment.service';
import { Event } from '~/modules/events/entity/event.entity';
import { GeneratedEventTicket } from '~/modules/tickets/entities/generated-event-ticket.entity';
import { Ticket } from '~/modules/tickets/entities/ticket.entity';
import { QRService } from '~/modules/qr-code/qr-code.service';
import { PdfService } from '~/modules/pdf/pdf.service';
import { EmailService } from '~/infrastructure/email/email.service';
import { StorageService } from '~/infrastructure/storage/storage.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderItemResponseDto, OrderResponseDto } from './dto/order-response.dto';
import { OrderStatusResponseDto } from './dto/order-status-response.dto';
import { Order } from './entity/order.entity';
import { OrderItem } from './entity/order-item.entity';
import { ORDER_PAGINATION_CONFIG } from './order-pagination.config';
import { PaymentStatus } from '~/modules/payments/payment.enum';
import type { Transaction } from '~/modules/payments/entities/transaction.entity';
import { QueryUserOrdersDto } from './dto/query-user-orders.dto';
import * as PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';

type LoadedOrder = Order & {
  orderItems?: Array<
    OrderItem & {
      ticket?: Ticket;
      generatedTickets?: GeneratedEventTicket[];
    }
  >;
};

@Injectable()
export class OrderService {
  constructor(
    private readonly logger: PinoLogger,

    @Inject(REPOSITORY.ORDER)
    private readonly orderRepository: Repository<Order>,

    @Inject(REPOSITORY.ORDER_ITEM)
    private readonly orderItemRepository: Repository<OrderItem>,

    @Inject(REPOSITORY.TICKET)
    private readonly ticketRepository: Repository<Ticket>,

    @Inject(REPOSITORY.EVENT)
    private readonly eventRepository: Repository<Event>,

    @Inject(REPOSITORY.GENERATED_EVENT_TICKET)
    private readonly generatedTicketRepository: Repository<GeneratedEventTicket>,

    private readonly paymentService: PaymentService,
    private readonly qrService: QRService,
    private readonly pdfService: PdfService,
    private readonly emailService: EmailService,
    private readonly storageService: StorageService,
  ) {}

  async createOrder(dto: CreateOrderDto, userId: string, userEmail: string): Promise<OrderResponseDto> {
    if (!dto.items?.length) throw new BadRequestException('At least one ticket item is required');

    const event = dto.eventId ? await this.eventRepository.findOne({ where: { id: dto.eventId } }) : null;

    if (dto.eventId && !event) throw new NotFoundException(`Event ${dto.eventId} not found`);

    const now = new Date();
    const expiration = new Date(now.getTime() + ORDER_TTL_MINUTES * 60 * 1000);

    let createdOrder: Order | undefined;

    this.logger.debug('Creating Orders');
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
          relations: ['event'],
        });

        if (!ticket) throw new NotFoundException(`Ticket ${item.ticketId} not found`);

        if (dto.eventId && ticket.eventId !== dto.eventId)
          throw new BadRequestException(`Ticket ${ticket.id} does not belong to event ${dto.eventId}`);

        const remaining = Number(ticket.quota) - Number(ticket.sold ?? 0);

        if (remaining < quantity) throw new BadRequestException(`Insufficient quota for ticket ${ticket.id}`);

        const price = Number(ticket.price);
        const subtotal = price * quantity;
        totalAmount += subtotal;

        // Don't deduct quota yet - only confirm booking
        // Quota will be deducted when payment is completed
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

    if (!createdOrder) throw new Error('Failed to create order');

    try {
      const payment = await this.paymentService.createInvoice({
        externalId: createdOrder.id,
        amount: createdOrder.totalAmount,
        payerEmail: userEmail,
        description: dto.description ?? `Ticket order ${createdOrder.id}`,
        successRedirectUrl: dto.successRedirectUrl,
        failureRedirectUrl: dto.failureRedirectUrl,
      });

      if ([PaymentStatus.PAID, PaymentStatus.SETTLED].includes(payment.status)) {
        await this.handleSuccessfulPayment(createdOrder.id);
      }
    } catch (error) {
      this.logger.error({ orderId: createdOrder.id, error }, 'Payment creation failed, cancelling order');
      await this.cancelOrderInternal(createdOrder.id, true);
      throw error;
    }

    const order = await this.findOrderById(createdOrder.id, userId);
    return this.toOrderResponse(order);
  }

  async getOrderById(id: string, userId: string): Promise<OrderResponseDto> {
    const order = await this.findOrderById(id, userId);
    return this.toOrderResponse(order);
  }

  async getOrderStatus(id: string, userId: string): Promise<OrderStatusResponseDto> {
    const order = await this.findOrderById(id, userId);
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
    const order = await this.findOrderById(id, userId);
    if (![OrderStatus.PAID].includes(order.status)) {
      const payment = await this.getPaymentByOrderId(order.id);
      if (payment?.status !== PaymentStatus.SETTLED) {
        throw new BadRequestException('Tickets are only available after the order is paid');
      }
    }

    const generated = await this.generateTicketsForOrder(order.id);
    return generated.map((ticket) => ({
      id: ticket.id,
      orderItemId: ticket.orderItemId,
      ticketId: ticket.ticketId,
      qrCodeUrl: ticket.qrCodeUrl,
      pdfUrl: ticket.pdfUrl,
      isUsed: ticket.isUsed,
      issuedAt: ticket.issuedAt,
    }));
  }

  async cancelOrder(id: string, userId: string): Promise<OrderResponseDto> {
    const order = await this.findOrderById(id, userId);
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Only pending orders can be cancelled');
    }

    await this.cancelOrderInternal(id, false);
    const updated = await this.findOrderById(id, userId);
    return this.toOrderResponse(updated);
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
        // Add userId filter to the query using filter property
        userId,
      },
    };

    const paginatedOrders = await paginate(mappedQuery, this.orderRepository, ORDER_PAGINATION_CONFIG);

    // Manually set payment info for each order
    const ordersWithPayment = await Promise.all(
      paginatedOrders.data.map(async (order) => {
        const payment = await this.getPaymentByOrderId(order.id);
        return this.toOrderResponse(order as LoadedOrder, payment);
      }),
    );

    return {
      meta: paginatedOrders.meta,
      links: paginatedOrders.links,
      data: ordersWithPayment,
    };
  }

  async findOrderById(orderId: string, userId?: string): Promise<LoadedOrder> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['orderItems', 'orderItems.ticket', 'orderItems.generatedTickets'],
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (userId && order.userId !== userId) {
      throw new ForbiddenException('You are not allowed to access this order');
    }

    return order as LoadedOrder;
  }

  async findExpiredPendingOrders(): Promise<Order[]> {
    return this.orderRepository.find({
      where: {
        status: OrderStatus.PENDING,
        expiredAt: LessThan(new Date()),
      },
      order: { expiredAt: 'ASC' },
      take: 100,
    });
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
    const order = await this.findOrderById(orderId);
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
    const order = await this.findOrderById(orderId);
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Only pending orders can update expiration');
    }

    order.expiredAt = expiredAt;
    return this.orderRepository.save(order);
  }

  async releaseTicketQuotas(orderId: string): Promise<void> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['orderItems', 'orderItems.ticket'],
    });

    if (!order?.orderItems?.length) return;

    for (const item of order.orderItems) {
      if (!item.ticket) continue;

      const ticket = await this.ticketRepository.findOne({ where: { id: item.ticketId } });
      if (!ticket) continue;

      const currentSold = Number(ticket.sold ?? 0);
      ticket.sold = Math.max(0, currentSold - Number(item.quantity));
      await this.ticketRepository.save(ticket);
    }
  }

  async generateTicketsForOrder(orderId: string): Promise<GeneratedEventTicket[]> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['orderItems', 'orderItems.ticket', 'orderItems.ticket.event', 'orderItems.generatedTickets'],
    });

    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    if (![OrderStatus.PAID].includes(order.status)) {
      const payment = await this.getPaymentByOrderId(orderId);
      if (payment?.status !== PaymentStatus.SETTLED) {
        throw new BadRequestException(`Order ${orderId} is not paid`);
      }
    }

    const generatedTickets: GeneratedEventTicket[] = [];

    for (const orderItem of order.orderItems ?? []) {
      const existingCount = await this.generatedTicketRepository.count({
        where: { orderItemId: orderItem.id },
      });

      const ticketsToCreate = Math.max(0, Number(orderItem.quantity) - existingCount);
      for (let index = 0; index < ticketsToCreate; index += 1) {
        const ticket = this.generatedTicketRepository.create({
          orderItemId: orderItem.id,
          ticketId: orderItem.ticketId,
          qrCodeUrl: 'pending',
          pdfUrl: 'pending',
          isUsed: false,
          issuedAt: new Date(),
        });

        const saved = await this.generatedTicketRepository.save(ticket);

        // Generate QR code
        const qrCodePayload = await this.qrService.generate(saved.id, orderItem.ticket.eventId);
        saved.qrCodeUrl = qrCodePayload;

        // Generate PDF with QR code embedded
        const pdfBuffer = await this.generateTicketPdf(saved, orderItem.ticket, qrCodePayload);

        // Store PDF (using storage service through pdfService)
        const pdfUrl = await this.storeTicketPdf(saved.id, pdfBuffer);
        saved.pdfUrl = pdfUrl;

        const persisted = await this.generatedTicketRepository.save(saved);
        generatedTickets.push(persisted);
      }
    }

    // Send email to user with tickets
    if (generatedTickets.length > 0) await this.sendTicketEmail(order.userId, order, generatedTickets);

    return generatedTickets;
  }

  async handleSuccessfulPayment(orderId: string): Promise<void> {
    const order = await this.findOrderById(orderId);
    if (order.status !== OrderStatus.PENDING) return;

    // Deduct quota for each ticket in the order
    for (const orderItem of [...(order.orderItems ?? [])]) {
      const ticket = orderItem.ticket; // Already loaded from relations

      if (ticket) {
        ticket.sold = Number(ticket.sold ?? 0) + Number(orderItem.quantity);
        await this.ticketRepository.save(ticket);
        this.logger.info(
          {
            ticketId: ticket.id,
            ticketName: ticket.name,
            quantity: orderItem.quantity,
            newSold: ticket.sold,
          },
          'Ticket quota deducted after payment',
        );
      }
    }

    order.status = OrderStatus.PAID;
    await this.orderRepository.save(order);

    // Now generate tickets after quota is deducted
    await this.generateTicketsForOrder(orderId);
  }

  async handleExpiredPayment(orderId: string): Promise<void> {
    const order = await this.findOrderById(orderId);
    if (order.status !== OrderStatus.PENDING) return;

    await this.updateOrderStatus(orderId, OrderStatus.EXPIRED);
  }

  async handleFailedPayment(orderId: string): Promise<void> {
    const order = await this.findOrderById(orderId);
    if (order.status !== OrderStatus.PENDING) return;

    await this.updateOrderStatus(orderId, OrderStatus.CANCELLED);
  }

  async getPaymentByOrderId(orderId: string) {
    return this.paymentService.getTransactionByExternalId(orderId);
  }

  private async cancelOrderInternal(orderId: string, dueToPaymentFailure: boolean): Promise<void> {
    const order = await this.findOrderById(orderId);
    if (order.status !== OrderStatus.PENDING) return;

    order.status = OrderStatus.CANCELLED;
    await this.orderRepository.save(order);
    await this.releaseTicketQuotas(orderId);

    if (dueToPaymentFailure) {
      this.logger.warn({ orderId }, 'Order cancelled because payment creation failed');
    }
  }

  private async toOrderResponse(order: LoadedOrder, payment?: Transaction | null): Promise<OrderResponseDto> {
    const transaction = payment ?? (await this.getPaymentByOrderId(order.id));

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

  private async generateTicketPdf(generatedTicket: GeneratedEventTicket, ticket: Ticket, qrCodePayload: string): Promise<Buffer> {
    try {
      // Generate QR code image from payload first
      const qrBuffer = await QRCode.toBuffer(qrCodePayload, {
        type: 'png',
        width: 150,
        margin: 1,
      });

      return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (error) => reject(error instanceof Error ? error : new Error(String(error))));

        doc.fontSize(24).text(ticket.event?.title || 'Event Ticket', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(12).text(`Date: ${ticket.event?.startDate?.toISOString() || 'TBD'}`, { align: 'center' });
        doc.text(`Location: ${ticket.event?.location || 'TBD'}`, { align: 'center' });
        doc.moveDown(1);
        doc.fontSize(14).text(`Ticket ID: ${generatedTicket.id}`);
        doc.text(`Order ID: ${generatedTicket.orderItemId}`);
        doc.text(`Ticket Type: ${ticket.name}`);
        doc.moveDown(1);

        doc.image(qrBuffer, { width: 150, align: 'center' });

        doc.end();
      });
    } catch (error) {
      throw new Error(`Failed to generate QR code: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async storeTicketPdf(ticketId: string, pdfBuffer: Buffer): Promise<string> {
    try {
      // Use the storage service to upload the PDF
      const uploadResult = await this.storageService.uploadFile({
        bucket: 'tickets-public',
        file: pdfBuffer,
        metadata: {
          originalname: `${ticketId}.pdf`,
          mimetype: 'application/pdf',
        },
      });

      // Check if upload was successful
      if (!uploadResult.success) {
        const errorMessage = uploadResult.error || 'Unknown upload error';
        this.logger.error({ ticketId, error: errorMessage }, 'Storage upload failed');
        throw new Error(`Storage upload failed: ${errorMessage}`);
      }

      // Return the full download URL
      if (uploadResult.filename) {
        const downloadUrl = `/api/storage/download/tickets-public/${uploadResult.filename}`;
        this.logger.info({ ticketId, filename: uploadResult.filename }, 'PDF stored successfully');
        return downloadUrl;
      }

      throw new Error('Upload succeeded but no filename returned');
    } catch (error) {
      this.logger.error({ ticketId, error: error instanceof Error ? error.message : String(error) }, 'Failed to store ticket PDF');
      throw error;
    }
  }

  private async sendTicketEmail(userId: string, order: LoadedOrder, tickets: GeneratedEventTicket[]): Promise<void> {
    try {
      // Get user email - you might need to inject a user service or repository
      // For now, we'll assume we can get the user email from the order context
      const userEmail = 'user@example.com'; // This should be fetched from user service

      const ticketLinks = tickets.map((ticket) => `<li>Ticket ID: ${ticket.id} - <a href="${ticket.pdfUrl}">Download PDF</a></li>`).join('');

      const emailHtml = `
        <h2>Your Tickets Are Ready!</h2>
        <p>Thank you for your purchase. Your tickets for order ${order.id} are now available.</p>
        <h3>Ticket Details:</h3>
        <ul>
          ${ticketLinks}
        </ul>
        <p>Please present these tickets at the event entrance.</p>
        <p>Best regards,<br>Event Management Team</p>
      `;

      await this.emailService.sendEmail({
        to: userEmail,
        subject: `Your Tickets - Order ${order.id}`,
        html: emailHtml,
      });

      this.logger.info({ userId, orderId: order.id, ticketCount: tickets.length }, 'Ticket email sent successfully');
    } catch (error) {
      this.logger.error({ userId, orderId: order.id, error }, 'Failed to send ticket email');
      // Don't throw error here to avoid breaking the ticket generation flow
    }
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
}
